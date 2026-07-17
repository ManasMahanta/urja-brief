// Indian mutual-fund data + analytics.
//
// Two sources, both free and both official-ish:
//   - AMFI's NAVAll.txt is the canonical universe (~14k schemes) and is the ONLY
//     one that carries scheme category, because the file encodes it as section
//     headers. It backs search, peers, and Direct/Regular pairing.
//   - MFAPI.in (a keyless JSON wrapper over the same AMFI publication) supplies
//     full per-scheme NAV history, which NAVAll.txt does not carry.
//   - Yahoo ^NSEI supplies the Nifty 50 benchmark.
//
// MFAPI's /mf/search is deliberately NOT used: it truncates at 15 results
// ordered by scheme code, so "Flexi Cap" returns three ancient funds and misses
// HDFC/SBI/Kotak entirely. Searching AMFI ourselves returns all 45.
//
// Everything here is REAL — fund analysis is fundamentally returns-and-risk
// maths over a NAV series, and India publishes that openly.
//
// What is NOT available free and must never be faked: portfolio holdings and
// sector allocation (SEBI mandates monthly disclosure but each AMC publishes
// its own XLS/PDF), absolute TER, AUM, and manager name. The cost section
// therefore derives the expense *differential* empirically from the Direct vs
// Regular NAV divergence rather than quoting a TER we cannot source.
//
// NAV is published T+1, so the latest point is normally yesterday. Callers must
// label it "as of <date>", never "live".

import { unstable_cache } from "next/cache";

const MFAPI = "https://api.mfapi.in";
const AMFI_NAV = "https://portal.amfiindia.com/spages/NAVAll.txt"; // www. 302s here
const DAY = 86_400_000;
const RISK_FREE = 0.065; // ~Indian 1y T-bill. Stated wherever Sharpe/alpha shows.
const TTL = 43_200; // 12h — NAV only moves once a day

/* --- types -------------------------------------------------------------- */

export type NavPoint = { t: number; v: number };

export type FundMeta = {
  code: number;
  name: string;
  house: string;
  category: string;
  type: string;
  isin: string | null;
  plan: "Direct" | "Regular";
};

export type ReturnRow = { label: string; years: number; fund: number | null; bench: number | null };

export type RiskStats = {
  vol: number;
  sharpe: number;
  sortino: number;
  maxDD: number;
  maxDDFrom: string;
  maxDDTo: string;
  recoveryDays: number | null;
  best1Y: number | null;
  worst1Y: number | null;
};

export type RollingStats = { years: number; min: number; median: number; max: number; positivePct: number; count: number };

export type BenchStats = { beta: number; alpha: number; correlation: number; upCapture: number; downCapture: number };

export type DragRow = { years: number; direct: number; regular: number; drag: number };

export type CostDrag = {
  siblingCode: number;
  rows: DragRow[];
  lumpsum: { years: number; direct: number; regular: number; cost: number } | null;
};

export type PeerRow = { code: number; name: string; house: string; r1: number | null; r3: number | null; r5: number | null; vol: number | null };

export type FundData = {
  meta: FundMeta;
  latest: NavPoint;
  prev: NavPoint | null;
  inception: number;
  chart: NavPoint[]; // downsampled for rendering
  returns: ReturnRow[];
  risk: RiskStats | null;
  rolling: RollingStats | null;
  bench: BenchStats | null;
  drag: CostDrag | null;
  peers: PeerRow[];
};

export type SearchHit = { code: number; name: string; house: string; category: string };

/* --- fetching ----------------------------------------------------------- */

// AMFI and MFAPI are both hosted in India and are small free services; 8s was
// too tight to survive a slow upstream and silently failed whole renders.
// Functions run in bom1 (see vercel.json) so this is headroom, not the norm.
async function getJson<T>(url: string, ms = 15_000): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BazaarBrief/1.0)" },
      signal: ctrl.signal,
      cache: "no-store", // caching is handled by unstable_cache above this layer
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function getText(url: string, ms = 20_000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BazaarBrief/1.0)" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** MFAPI dates are DD-MM-YYYY; parse to a UTC timestamp. */
function parseDate(s: string): number {
  const [d, m, y] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/* --- AMFI universe ------------------------------------------------------ */

/** [code, name, houseIdx, catIdx] — indices keep the cached blob ~1.1MB
 *  instead of ~2MB of repeated AMC/category strings. */
type UniRow = [number, string, number, number];
type Universe = { houses: string[]; cats: string[]; rows: UniRow[]; sizes: number[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Strip plan/option noise so a fund's Direct and Regular rows collapse to the
 *  same key. Without dropping "option"/"plan", HDFC's two plans never pair:
 *  "…Growth Option - Direct Plan" vs "…Growth Plan". */
const pairKey = (name: string) => norm(name.replace(/\b(direct|regular|plan|option)\b/gi, ""));

/** AMFI names Direct plans explicitly; Regular plans often carry no marker at
 *  all ("HDFC Flexi Cap Fund - Growth Plan"), so absence of "Direct" means
 *  Regular. Treating it as unknown would disable the cost section on some of
 *  the largest funds. */
const planOf = (name: string): FundMeta["plan"] => (/\bdirect\b/i.test(name) ? "Direct" : "Regular");

function parseUniverse(txt: string): Universe {
  const houses: string[] = [];
  const cats: string[] = [];
  const hIdx = new Map<string, number>();
  const cIdx = new Map<string, number>();
  const rows: UniRow[] = [];
  let cat = -1;
  let house = -1;

  for (const raw of txt.split("\n")) {
    const s = raw.trim();
    if (!s || s.startsWith("Scheme Code")) continue;

    const m = /^(?:Open|Close|Interval) Ended Schemes\s*\((.+)\)$/.exec(s);
    if (m) {
      const c = m[1].trim();
      if (!cIdx.has(c)) {
        cIdx.set(c, cats.length);
        cats.push(c);
      }
      cat = cIdx.get(c)!;
      continue;
    }
    if (s.endsWith("Mutual Fund")) {
      if (!hIdx.has(s)) {
        hIdx.set(s, houses.length);
        houses.push(s);
      }
      house = hIdx.get(s)!;
      continue;
    }
    if (!/^\d+;/.test(s)) continue;

    const p = s.split(";");
    if (p.length < 6) continue;
    const code = Number(p[0]);
    const name = p[3]?.trim();
    if (!Number.isFinite(code) || !name || cat < 0 || house < 0) continue;
    rows.push([code, name, house, cat]);
  }

  // Schemes per AMC — an objective size proxy for ranking peers, so we never
  // hand-curate a "top funds" list.
  const sizes = new Array(houses.length).fill(0);
  for (const r of rows) sizes[r[2]]++;
  return { houses, cats, rows, sizes };
}

const cachedUniverse = unstable_cache(
  async (): Promise<Universe> => {
    const txt = await getText(AMFI_NAV);
    if (!txt) throw new Error("no amfi");
    const u = parseUniverse(txt);
    if (u.rows.length < 1000) throw new Error("amfi parse looks wrong");
    return u;
  },
  ["mf-universe"],
  { revalidate: TTL, tags: ["mf"] },
);

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type RawFund = {
  meta?: Record<string, string | number | null>;
  data?: { date: string; nav: string }[];
};

async function rawFund(code: number): Promise<{ meta: FundMeta; nav: NavPoint[] } | null> {
  const d = await getJson<RawFund>(`${MFAPI}/mf/${code}`);
  const m = d?.meta;
  if (!m || !d?.data?.length) return null;

  const nav = d.data
    .map((x) => ({ t: parseDate(x.date), v: Number(x.nav) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v) && p.v > 0)
    .sort((a, b) => a.t - b.t);
  if (nav.length < 2) return null;

  const name = String(m.scheme_name ?? "");
  return {
    meta: {
      code,
      name,
      house: String(m.fund_house ?? "—"),
      category: String(m.scheme_category ?? "—"),
      type: String(m.scheme_type ?? "—"),
      isin: (m.isin_growth as string) ?? null,
      plan: planOf(name),
    },
    nav,
  };
}

/** Dated Nifty 50 closes — getDailyCloses() is 6mo and undated, too short here.
 *
 *  Uses an explicit epoch window rather than range=max: Yahoo silently downgrades
 *  range=max to monthly granularity (ignoring interval=1d), which starves the
 *  beta/alpha/capture maths of daily pairs while still looking fine in the
 *  returns table. period1/period2 returns true daily history back to 2007. */
async function benchSeries(): Promise<NavPoint[]> {
  const now = Math.floor(Date.now() / 1000);
  const d = await getJson<{
    chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
  }>(`https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?period1=0&period2=${now}&interval=1d`);
  const r = d?.chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const cl = r?.indicators?.quote?.[0]?.close ?? [];
  const out: NavPoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const v = cl[i];
    if (typeof v === "number") out.push({ t: Math.floor((ts[i] * 1000) / DAY) * DAY, v });
  }
  return out;
}

/* --- series maths ------------------------------------------------------- */

/** Last observation at or before t — NAV is only published on business days. */
function navAt(s: NavPoint[], t: number): NavPoint | null {
  let lo = 0;
  let hi = s.length - 1;
  let ans: NavPoint | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) {
      ans = s[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

const shiftYears = (t: number, y: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear() - y, d.getUTCMonth(), d.getUTCDate());
};
const shiftMonths = (t: number, m: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - m, d.getUTCDate());
};

/** Absolute % for <1y, annualised CAGR % beyond. Null when history is short. */
function periodReturn(s: NavPoint[], from: number, years: number): number | null {
  const end = s[s.length - 1];
  const start = navAt(s, from);
  // Guard against a "start" that predates the fund: navAt returns the earliest
  // point, which would silently inflate a 10y number on a 3y-old fund.
  if (!start || !end || start.t === end.t) return null;
  if (start.t < s[0].t - DAY) return null;
  const growth = end.v / start.v;
  return years >= 1 ? (Math.pow(growth, 1 / years) - 1) * 100 : (growth - 1) * 100;
}

function returnsTable(fund: NavPoint[], bench: NavPoint[]): ReturnRow[] {
  const end = fund[fund.length - 1].t;
  const inceptionYears = (end - fund[0].t) / (365.25 * DAY);
  const windows: { label: string; years: number; from: number }[] = [
    { label: "1M", years: 1 / 12, from: shiftMonths(end, 1) },
    { label: "3M", years: 0.25, from: shiftMonths(end, 3) },
    { label: "6M", years: 0.5, from: shiftMonths(end, 6) },
    { label: "1Y", years: 1, from: shiftYears(end, 1) },
    { label: "3Y", years: 3, from: shiftYears(end, 3) },
    { label: "5Y", years: 5, from: shiftYears(end, 5) },
    { label: "10Y", years: 10, from: shiftYears(end, 10) },
  ];
  const rows: ReturnRow[] = [];
  for (const w of windows) {
    // Only claim a window the fund has actually lived through.
    if (w.from < fund[0].t) continue;
    rows.push({
      label: w.label,
      years: w.years,
      fund: periodReturn(fund, w.from, w.years),
      bench: bench.length ? periodReturn(bench, w.from, w.years) : null,
    });
  }
  rows.push({
    label: "Inception",
    years: inceptionYears,
    fund: periodReturn(fund, fund[0].t, inceptionYears),
    bench: bench.length && bench[0].t <= fund[0].t ? periodReturn(bench, fund[0].t, inceptionYears) : null,
  });
  return rows;
}

const dailyReturns = (s: NavPoint[]) => {
  const out: { t: number; r: number }[] = [];
  for (let i = 1; i < s.length; i++) {
    const gap = s[i].t - s[i - 1].t;
    if (gap <= 0 || gap > 10 * DAY) continue; // skip long publication gaps
    out.push({ t: s[i].t, r: s[i].v / s[i - 1].v - 1 });
  }
  return out;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const i = s.length >> 1;
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};

function riskStats(s: NavPoint[]): RiskStats | null {
  const rs = dailyReturns(s);
  if (rs.length < 60) return null;
  const vals = rs.map((x) => x.r);
  const vol = stdev(vals) * Math.sqrt(252) * 100;

  const years = (s[s.length - 1].t - s[0].t) / (365.25 * DAY);
  const cagr = (Math.pow(s[s.length - 1].v / s[0].v, 1 / years) - 1) * 100;

  const downside = vals.filter((r) => r < 0);
  const dd = stdev(downside) * Math.sqrt(252) * 100;

  // Max drawdown + how long it took to reclaim the prior peak.
  let peak = s[0].v;
  let peakT = s[0].t;
  let maxDD = 0;
  let ddFrom = s[0].t;
  let ddTo = s[0].t;
  for (const p of s) {
    if (p.v > peak) {
      peak = p.v;
      peakT = p.t;
    }
    const draw = (p.v / peak - 1) * 100;
    if (draw < maxDD) {
      maxDD = draw;
      ddFrom = peakT;
      ddTo = p.t;
    }
  }
  const peakVal = navAt(s, ddFrom)?.v ?? peak;
  const recovered = s.find((p) => p.t > ddTo && p.v >= peakVal);
  const recoveryDays = recovered ? Math.round((recovered.t - ddTo) / DAY) : null;

  // Best / worst rolling 1y, sampled weekly.
  const oneY: number[] = [];
  for (let i = 0; i < s.length; i += 5) {
    const from = s[i].t;
    const to = shiftYears(from, -1);
    if (to > s[s.length - 1].t) break;
    const a = s[i];
    const b = navAt(s, to);
    if (a && b && b.t > a.t) oneY.push((b.v / a.v - 1) * 100);
  }

  return {
    vol,
    sharpe: vol > 0 ? (cagr - RISK_FREE * 100) / vol : 0,
    sortino: dd > 0 ? (cagr - RISK_FREE * 100) / dd : 0,
    maxDD,
    maxDDFrom: fmtDate(ddFrom),
    maxDDTo: fmtDate(ddTo),
    recoveryDays,
    best1Y: oneY.length ? Math.max(...oneY) : null,
    worst1Y: oneY.length ? Math.min(...oneY) : null,
  };
}

/** Rolling CAGR distribution — how consistent, not just how lucky at the end. */
function rollingStats(s: NavPoint[], years = 3): RollingStats | null {
  const end = s[s.length - 1].t;
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 5) {
    const from = s[i].t;
    const to = shiftYears(from, -years);
    if (to > end) break;
    const a = s[i];
    const b = navAt(s, to);
    if (a && b && b.t > a.t) out.push((Math.pow(b.v / a.v, 1 / years) - 1) * 100);
  }
  if (out.length < 12) return null;
  return {
    years,
    min: Math.min(...out),
    median: median(out),
    max: Math.max(...out),
    positivePct: (out.filter((x) => x > 0).length / out.length) * 100,
    count: out.length,
  };
}

function benchStats(fund: NavPoint[], bench: NavPoint[]): BenchStats | null {
  if (bench.length < 60) return null;
  const bMap = new Map(bench.map((p) => [p.t, p.v]));
  // Intersect on dates both series published.
  const pairs: { f: number; b: number }[] = [];
  const fr = dailyReturns(fund);
  const bRet = new Map(dailyReturns(bench).map((x) => [x.t, x.r]));
  for (const x of fr) {
    const b = bRet.get(x.t);
    if (typeof b === "number") pairs.push({ f: x.r, b });
  }
  if (pairs.length < 60) return null;

  const fs = pairs.map((p) => p.f);
  const bs = pairs.map((p) => p.b);
  const mf = mean(fs);
  const mb = mean(bs);
  let cov = 0;
  let varB = 0;
  for (const p of pairs) {
    cov += (p.f - mf) * (p.b - mb);
    varB += (p.b - mb) ** 2;
  }
  cov /= pairs.length - 1;
  varB /= pairs.length - 1;
  const beta = varB > 0 ? cov / varB : 0;
  const correlation = stdev(fs) * stdev(bs) > 0 ? cov / (stdev(fs) * stdev(bs)) : 0;

  // Jensen's alpha over the overlapping window, annualised.
  const first = pairs.length ? fund.find((p) => bMap.has(p.t)) : null;
  const start = first ?? fund[0];
  const yrs = (fund[fund.length - 1].t - start.t) / (365.25 * DAY);
  const fC = Math.pow(fund[fund.length - 1].v / start.v, 1 / yrs) - 1;
  const bStart = navAt(bench, start.t);
  const bC = bStart ? Math.pow(bench[bench.length - 1].v / bStart.v, 1 / yrs) - 1 : 0;
  const alpha = (fC - (RISK_FREE + beta * (bC - RISK_FREE))) * 100;

  const up = pairs.filter((p) => p.b > 0);
  const dn = pairs.filter((p) => p.b < 0);
  const cap = (xs: { f: number; b: number }[]) => (xs.length && mean(xs.map((x) => x.b)) !== 0 ? (mean(xs.map((x) => x.f)) / mean(xs.map((x) => x.b))) * 100 : 0);

  return { beta, alpha, correlation, upCapture: cap(up), downCapture: cap(dn) };
}

/* --- SIP ---------------------------------------------------------------- */

export type SipResult = { invested: number; value: number; xirr: number | null; months: number; units: number };

/** XIRR by bisection — robust where Newton diverges on irregular flows. */
function xirr(flows: { t: number; amt: number }[]): number | null {
  if (flows.length < 2) return null;
  const t0 = flows[0].t;
  const npv = (r: number) => flows.reduce((s, f) => s + f.amt / Math.pow(1 + r, (f.t - t0) / (365 * DAY)), 0);
  let lo = -0.9999;
  let hi = 10;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

/** Monthly SIP on the same day each month, bought at the prevailing NAV. */
export function simulateSip(nav: NavPoint[], monthly: number, years: number): SipResult | null {
  if (!nav.length) return null;
  const end = nav[nav.length - 1];
  const start = Math.max(shiftYears(end.t, years), nav[0].t);
  const flows: { t: number; amt: number }[] = [];
  let units = 0;
  let invested = 0;

  const d = new Date(start);
  let cur = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  while (cur <= end.t) {
    const p = navAt(nav, cur);
    if (p) {
      units += monthly / p.v;
      invested += monthly;
      flows.push({ t: cur, amt: -monthly });
    }
    const c = new Date(cur);
    cur = Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, c.getUTCDate());
  }
  if (!flows.length) return null;
  const value = units * end.v;
  flows.push({ t: end.t, amt: value });
  return { invested, value, xirr: xirr(flows), months: flows.length - 1, units };
}

/* --- Direct vs Regular drag -------------------------------------------- */

/** The sibling plan tracks the same portfolio, so the NAV gap IS the
 *  commission. This is the only free way to quantify the cost of a Regular
 *  plan — no free API exposes TER. */
async function costDrag(meta: FundMeta, fund: NavPoint[]): Promise<CostDrag | null> {
  const want = meta.plan === "Direct" ? "Regular" : "Direct";
  const uni = await cachedUniverse().catch(() => null);
  if (!uni) return null;

  const self = uni.rows.find((r) => r[0] === meta.code);
  if (!self) return null;
  const key = pairKey(self[1]);
  // Same AMC + same category + same pair key + opposite plan.
  const sibling = uni.rows.find(
    (r) => r[0] !== meta.code && r[2] === self[2] && r[3] === self[3] && planOf(r[1]) === want && pairKey(r[1]) === key,
  );
  if (!sibling) return null;

  const other = await rawFund(sibling[0]);
  if (!other) return null;

  const direct = meta.plan === "Direct" ? fund : other.nav;
  const regular = meta.plan === "Direct" ? other.nav : fund;

  const rows: DragRow[] = [];
  for (const y of [1, 3, 5, 10]) {
    const end = Math.min(direct[direct.length - 1].t, regular[regular.length - 1].t);
    const from = shiftYears(end, y);
    if (from < direct[0].t || from < regular[0].t) continue;
    const a = periodReturn(direct, from, y);
    const b = periodReturn(regular, from, y);
    if (a === null || b === null) continue;
    rows.push({ years: y, direct: a, regular: b, drag: a - b });
  }
  if (!rows.length) return null;

  const longest = rows[rows.length - 1];
  const grow = (r: number) => 1_000_000 * Math.pow(1 + r / 100, longest.years);
  return {
    siblingCode: sibling[0],
    rows,
    lumpsum: {
      years: longest.years,
      direct: grow(longest.direct),
      regular: grow(longest.regular),
      cost: grow(longest.direct) - grow(longest.regular),
    },
  };
}

/* --- peers -------------------------------------------------------------- */

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

/** Same-category funds from the AMFI universe, ranked by how many schemes the
 *  AMC runs — an objective size proxy, so the shortlist surfaces the houses a
 *  reader would recognise without us hand-picking "top" funds.
 *
 *  Cached separately from the fund itself and throwing on failure: this is the
 *  page's most fetch-hungry piece (six NAV histories), and folding it into the
 *  fund's cache meant one slow upstream pinned an empty peer table for 12h. */
const cachedPeers = unstable_cache(
  async (code: number): Promise<PeerRow[]> => {
    const uni = await cachedUniverse();
    const self = uni.rows.find((r) => r[0] === code);
    if (!self) throw new Error("not in universe");
    const plan = planOf(self[1]);

    const cands = uni.rows
      .filter(
        (r) =>
          r[0] !== code &&
          r[3] === self[3] && // same category
          planOf(r[1]) === plan &&
          /growth/i.test(r[1]) &&
          !/idcw|dividend/i.test(r[1]),
      )
      .sort((a, b) => uni.sizes[b[2]] - uni.sizes[a[2]])
      .slice(0, 6);

    const rows = await mapLimit(cands, 2, async (c) => {
      const f = await rawFund(c[0]).catch(() => null);
      if (!f) return null;
      const end = f.nav[f.nav.length - 1].t;
      const r = (y: number) => (shiftYears(end, y) >= f.nav[0].t ? periodReturn(f.nav, shiftYears(end, y), y) : null);
      return {
        code: c[0],
        name: f.meta.name,
        house: uni.houses[c[2]],
        r1: r(1),
        r3: r(3),
        r5: r(5),
        vol: riskStats(f.nav)?.vol ?? null,
      } satisfies PeerRow;
    });
    const out = rows.filter((r): r is PeerRow => r !== null);
    if (!out.length) throw new Error("no peers resolved");
    return out;
  },
  ["mf-peers"],
  { revalidate: TTL, tags: ["mf"] },
);

/* --- public API --------------------------------------------------------- */

/** Scheme search across AMFI's ~14k schemes.
 *
 *  Matching is token-AND over a punctuation-stripped name, which is what makes
 *  "sbi bluechip" find "SBI Blue Chip Fund" — spacing in AMFI names is wildly
 *  inconsistent ("Flexicap" vs "Flexi Cap"), so anything stricter misses funds.
 *  Direct+Growth ranks first: it's what a self-directed reader wants, and it
 *  keeps the two plans of one fund from crowding the list. */
export async function searchFunds(q: string, limit = 12): Promise<SearchHit[]> {
  const tokens = q.trim().toLowerCase().split(/\s+/).map(norm).filter(Boolean);
  if (!tokens.length || q.trim().length < 3) return [];
  const uni = await cachedUniverse().catch(() => null);
  if (!uni) return [];

  const scored: { hit: SearchHit; rank: number }[] = [];
  for (const r of uni.rows) {
    const n = norm(r[1]);
    if (!tokens.every((t) => n.includes(t))) continue;
    const direct = planOf(r[1]) === "Direct";
    const growth = /growth/i.test(r[1]);
    // Lower is better: Direct+Growth, then bigger AMCs, then shorter (more
    // canonical) names.
    const rank = (direct ? 0 : 4) + (growth ? 0 : 2) - uni.sizes[r[2]] / 100_000 + r[1].length / 10_000;
    scored.push({ hit: { code: r[0], name: r[1], house: uni.houses[r[2]], category: uni.cats[r[3]] }, rank });
    if (scored.length > 400) break;
  }
  return scored.sort((a, b) => a.rank - b.rank).slice(0, limit).map((s) => s.hit);
}

/** Downsample for charting — 3k+ points is far more than a sparkline needs. */
function downsample(s: NavPoint[], n = 240): NavPoint[] {
  if (s.length <= n) return s;
  const step = (s.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => s[Math.round(i * step)]);
}

const cachedFund = unstable_cache(
  async (code: number): Promise<Omit<FundData, "peers">> => {
    const f = await rawFund(code);
    if (!f) throw new Error("no fund");
    const bench = await benchSeries().catch(() => [] as NavPoint[]);
    const drag = await costDrag(f.meta, f.nav).catch(() => null);
    return {
      meta: f.meta,
      latest: f.nav[f.nav.length - 1],
      prev: f.nav[f.nav.length - 2] ?? null,
      inception: f.nav[0].t,
      chart: downsample(f.nav),
      returns: returnsTable(f.nav, bench),
      risk: riskStats(f.nav),
      rolling: rollingStats(f.nav),
      bench: benchStats(f.nav, bench),
      drag,
    };
  },
  ["mf-fund"],
  { revalidate: TTL, tags: ["mf"] },
);

/** Fund analytics without the peer table. The comparison page needs several
 *  funds at once and never renders peers — resolving them anyway meant six extra
 *  NAV fetches per fund (18+ for one comparison), which is what pushed cold
 *  funds past the request budget and silently dropped them from the table. */
export async function getFundCore(code: number): Promise<FundData | null> {
  if (!Number.isFinite(code)) return null;
  const base = await cachedFund(code).catch(() => null);
  return base ? { ...base, peers: [] } : null;
}

/** Full fund analytics. Null when the scheme can't be loaded. Peers resolve
 *  independently so a slow upstream costs the peer table, not the page. */
export async function getFund(code: number): Promise<FundData | null> {
  const base = await getFundCore(code);
  if (!base) return null;
  const peers = await cachedPeers(code).catch(() => [] as PeerRow[]);
  return { ...base, peers };
}

/** Raw NAV series — the SIP simulator needs full history, not the downsample. */
const cachedNav = unstable_cache(
  async (code: number): Promise<NavPoint[]> => {
    const f = await rawFund(code);
    if (!f) throw new Error("no fund");
    return f.nav;
  },
  ["mf-nav"],
  { revalidate: TTL, tags: ["mf"] },
);

export async function getNav(code: number): Promise<NavPoint[] | null> {
  return cachedNav(code).catch(() => null);
}

export const RISK_FREE_PCT = RISK_FREE * 100;
