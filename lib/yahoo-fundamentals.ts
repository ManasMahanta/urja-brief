// ============================================================================
// Free Yahoo fundamentals via the cookie→crumb handshake (the mechanism
// yfinance uses). Fills the dissection's fundamentals, financial-health,
// ownership, and technical-indicator sections with REAL data — no paid
// provider. Still unofficial Yahoo, so every fetcher degrades to null and the
// UI falls back to placeholders.
// ============================================================================

import { unstable_cache } from "next/cache";
import { getDailyCloses } from "@/lib/market";

/** Run async work over items with bounded concurrency (avoids burst-throttling). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) BazaarBrief/1.0";

// ---- crumb + cookie cache -------------------------------------------------

let auth: { cookie: string; crumb: string; at: number } | null = null;
const AUTH_TTL = 25 * 60 * 1000; // refresh every ~25 min

// Circuit breaker: if the handshake (or a call) fails — e.g. Yahoo is
// throttling us — stop re-attempting for a cooldown so a whole dissection
// fast-fails to placeholders instead of spending 60s+ retrying and timing out.
let authFailedAt = 0;
const AUTH_COOLDOWN = 60 * 1000;

async function fetchWithTimeout(url: string, init: RequestInit & { next?: { revalidate: number } }, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getAuth(force = false): Promise<{ cookie: string; crumb: string } | null> {
  if (!force && auth && Date.now() - auth.at < AUTH_TTL) return auth;
  if (Date.now() - authFailedAt < AUTH_COOLDOWN) return null; // in cooldown — fast-fail
  try {
    const r1 = await fetchWithTimeout("https://fc.yahoo.com", { headers: { "User-Agent": UA } }, 4000);
    const headers = r1.headers as Headers & { getSetCookie?: () => string[] };
    const raw = headers.getSetCookie?.() ?? [r1.headers.get("set-cookie") ?? ""];
    const cookie = raw
      .filter(Boolean)
      .map((c) => c.split(";")[0])
      .join("; ");
    if (!cookie) {
      authFailedAt = Date.now();
      return null;
    }
    const r2 = await fetchWithTimeout(
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
      { headers: { "User-Agent": UA, Cookie: cookie } },
      4000,
    );
    const crumb = (await r2.text()).trim();
    if (!crumb || crumb.includes("<") || crumb.length > 40) {
      authFailedAt = Date.now();
      return null;
    }
    auth = { cookie, crumb, at: Date.now() };
    authFailedAt = 0;
    return auth;
  } catch {
    authFailedAt = Date.now();
    return null;
  }
}

type Money = { raw?: number; fmt?: string } | undefined;
const fmt = (m: Money): string | undefined =>
  m?.fmt ?? (typeof m?.raw === "number" ? String(m.raw) : undefined);
const rawOf = (m: Money): number | undefined => (typeof m?.raw === "number" ? m.raw : undefined);

async function rawQuoteSummary(symbol: string, modules: string[]): Promise<Record<string, unknown> | null> {
  const a = await getAuth();
  if (!a) return null;
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol,
  )}?modules=${modules.join(",")}&crumb=${encodeURIComponent(a.crumb)}`;
  try {
    // no-store here: the URL carries a rotating crumb, so URL-keyed fetch
    // caching would orphan on every crumb refresh. We cache a layer up instead,
    // keyed by symbol+modules (see quoteSummary below).
    const res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": UA, Cookie: a.cookie }, cache: "no-store" },
      8000,
    );
    if (res.status === 401 || res.status === 429) {
      auth = null; // crumb expired / throttled
      authFailedAt = Date.now(); // trip the breaker so we don't re-handshake in a loop
      return null;
    }
    if (!res.ok) return null;
    const data = (await res.json()) as {
      quoteSummary?: { result?: Record<string, unknown>[] };
    };
    return data?.quoteSummary?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

// Cache successful quoteSummary results for 12h, keyed by symbol+modules —
// deliberately NOT by the crumb-bearing URL, so a crumb refresh doesn't orphan
// the cache. Fundamentals/statements/earnings change slowly, so 12h is ample
// and keeps upstream calls proportional to unique symbols, not to traffic.
// Failures THROW so they are never cached (a transient throttle must not stick).
const cachedQuoteSummary = unstable_cache(
  async (symbol: string, modulesCsv: string) => {
    const r = await rawQuoteSummary(symbol, modulesCsv.split(","));
    if (!r) throw new Error("quoteSummary unavailable");
    return r;
  },
  ["yahoo-quote-summary"],
  { revalidate: 43_200, tags: ["yahoo-fundamentals"] },
);

async function quoteSummary(symbol: string, modules: string[]): Promise<Record<string, unknown> | null> {
  try {
    return await cachedQuoteSummary(symbol, modules.join(","));
  } catch {
    return null;
  }
}

// ---- fundamentals ---------------------------------------------------------

export type Fundamentals = {
  marketCap?: string;
  trailingPE?: string;
  forwardPE?: string;
  eps?: string;
  priceToBook?: string;
  dividendYield?: string;
  beta?: string;
  sector?: string;
  industry?: string;
  employees?: string;
  ceo?: string;
  hq?: string;
  website?: string;
  summary?: string;
  officers?: { name: string; title: string }[];
  // financial health
  roe?: string;
  roa?: string;
  profitMargin?: string;
  operatingMargin?: string;
  grossMargin?: string;
  revenueGrowth?: string;
  earningsGrowth?: string;
  totalRevenue?: string;
  debtToEquity?: string;
  currentRatio?: string;
  totalCash?: string;
  totalDebt?: string;
  freeCashflow?: string;
  // consensus
  recommendation?: string;
  targetMean?: string;
  numAnalysts?: string;
  // ownership
  insidersPct?: string;
  institutionsPct?: string;
  // moving averages (real)
  fiftyDayAvg?: number;
  twoHundredDayAvg?: number;
  // earnings
  nextEarnings?: string;
};

export async function getFundamentals(symbol: string): Promise<Fundamentals | null> {
  const r = await quoteSummary(symbol, [
    "assetProfile",
    "price",
    "summaryDetail",
    "defaultKeyStatistics",
    "financialData",
    "majorHoldersBreakdown",
    "calendarEvents",
  ]);
  if (!r) return null;

  const ap = (r.assetProfile ?? {}) as Record<string, Money | unknown>;
  const price = (r.price ?? {}) as Record<string, Money>;
  const sd = (r.summaryDetail ?? {}) as Record<string, Money>;
  const ks = (r.defaultKeyStatistics ?? {}) as Record<string, Money>;
  const fd = (r.financialData ?? {}) as Record<string, Money>;
  const mh = (r.majorHoldersBreakdown ?? {}) as Record<string, Money>;
  const cal = (r.calendarEvents ?? {}) as Record<string, unknown>;

  const officers = (ap.companyOfficers as { title?: string; name?: string }[] | undefined) ?? [];
  const ceo =
    officers.find((o) => /chief exec|CEO|managing director|\bMD\b/i.test(o.title ?? ""))?.name ??
    officers[0]?.name;

  const city = ap.city as string | undefined;
  const country = ap.country as string | undefined;
  const hq = [city, country].filter(Boolean).join(", ") || undefined;

  const earnings = (cal.earnings as { earningsDate?: { fmt?: string }[] } | undefined)?.earningsDate;
  const nextEarnings = earnings?.[0]?.fmt;

  return {
    marketCap: fmt(price.marketCap) ?? fmt(sd.marketCap),
    trailingPE: fmt(sd.trailingPE),
    forwardPE: fmt(sd.forwardPE) ?? fmt(ks.forwardPE),
    eps: fmt(ks.trailingEps),
    priceToBook: fmt(ks.priceToBook),
    dividendYield: fmt(sd.dividendYield),
    beta: fmt(sd.beta) ?? fmt(ks.beta),
    sector: ap.sector as string | undefined,
    industry: ap.industry as string | undefined,
    employees:
      typeof ap.fullTimeEmployees === "number"
        ? (ap.fullTimeEmployees as number).toLocaleString("en-IN")
        : undefined,
    ceo,
    hq,
    website: ap.website as string | undefined,
    summary: ap.longBusinessSummary as string | undefined,
    officers: officers
      .filter((o) => o.name)
      .slice(0, 5)
      .map((o) => ({ name: String(o.name), title: String(o.title ?? "") })),
    roe: fmt(fd.returnOnEquity),
    roa: fmt(fd.returnOnAssets),
    profitMargin: fmt(fd.profitMargins),
    operatingMargin: fmt(fd.operatingMargins),
    grossMargin: fmt(fd.grossMargins),
    revenueGrowth: fmt(fd.revenueGrowth),
    earningsGrowth: fmt(fd.earningsGrowth),
    totalRevenue: fmt(fd.totalRevenue),
    debtToEquity: fmt(fd.debtToEquity),
    currentRatio: fmt(fd.currentRatio),
    totalCash: fmt(fd.totalCash),
    totalDebt: fmt(fd.totalDebt),
    freeCashflow: fmt(fd.freeCashflow),
    recommendation: (fd.recommendationKey as unknown as string) || undefined,
    targetMean: fmt(fd.targetMeanPrice),
    numAnalysts: fmt(fd.numberOfAnalystOpinions),
    insidersPct: fmt(mh.insidersPercentHeld),
    institutionsPct: fmt(mh.institutionsPercentHeld),
    fiftyDayAvg: rawOf(sd.fiftyDayAverage),
    twoHundredDayAvg: rawOf(sd.twoHundredDayAverage),
    nextEarnings,
  };
}

// ---- peers / competitive comparison ---------------------------------------

export type PeerRow = {
  symbol: string;
  name: string;
  sector?: string;
  marketCap?: string;
  trailingPE?: string;
  roe?: string;
  operatingMargin?: string;
  revenueGrowth?: string;
};

// Curated same-sector peers for common Indian large-caps — a reliable fallback
// when Yahoo's similarity endpoint returns nothing (it can be flaky).
const PEER_MAP: Record<string, string[]> = {
  TCS: ["INFY", "WIPRO", "HCLTECH", "TECHM"],
  INFY: ["TCS", "WIPRO", "HCLTECH", "TECHM"],
  WIPRO: ["TCS", "INFY", "HCLTECH", "TECHM"],
  HCLTECH: ["TCS", "INFY", "WIPRO", "TECHM"],
  HDFCBANK: ["ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK"],
  ICICIBANK: ["HDFCBANK", "SBIN", "KOTAKBANK", "AXISBANK"],
  SBIN: ["HDFCBANK", "ICICIBANK", "KOTAKBANK", "AXISBANK"],
  KOTAKBANK: ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK"],
  AXISBANK: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK"],
  RELIANCE: ["ONGC", "IOC", "BPCL", "NTPC"],
  TATAMOTORS: ["MARUTI", "M&M", "BAJAJ-AUTO", "EICHERMOT"],
  MARUTI: ["TATAMOTORS", "M&M", "BAJAJ-AUTO", "EICHERMOT"],
  SUNPHARMA: ["DRREDDY", "CIPLA", "DIVISLAB", "LUPIN"],
  ITC: ["HINDUNILVR", "NESTLEIND", "BRITANNIA", "DABUR"],
  HINDUNILVR: ["ITC", "NESTLEIND", "BRITANNIA", "DABUR"],
  TATASTEEL: ["JSWSTEEL", "HINDALCO", "SAIL", "JINDALSTEL"],
  BHARTIARTL: ["IDEA", "RELIANCE", "TATACOMM"],
  LT: ["SIEMENS", "ABB", "BHEL"],
  TITAN: ["KALYANKJIL", "PCJEWELLER"],
};

/** Similar/peer tickers from Yahoo's keyless recommendations endpoint (1 retry). */
async function getPeerSymbols(symbol: string, limit = 6): Promise<string[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`,
        { headers: { "User-Agent": UA }, next: { revalidate: 86400 } },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          finance?: { result?: ({ recommendedSymbols?: { symbol?: string }[] } | null)[] };
        };
        const recs = data?.finance?.result?.[0]?.recommendedSymbols ?? [];
        const syms = recs
          .map((r) => r.symbol)
          .filter((s): s is string => Boolean(s) && s !== symbol)
          .slice(0, limit);
        if (syms.length) return syms;
      }
    } catch {
      /* retry */
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
  }
  // Fallback: curated map for known Indian tickers.
  const suffix = symbol.match(/\.(NS|BO)$/)?.[0] ?? "";
  const bare = symbol.replace(/\.(NS|BO)$/, "").toUpperCase();
  const mapped = PEER_MAP[bare];
  return mapped ? mapped.map((s) => `${s}${suffix}`).slice(0, limit) : [];
}

/** A light fundamentals pull for a single peer (fewer modules than the full one). */
async function getPeerFundamentals(symbol: string): Promise<PeerRow | null> {
  const r = await quoteSummary(symbol, ["price", "summaryDetail", "financialData", "assetProfile"]);
  if (!r) return null;
  const price = (r.price ?? {}) as Record<string, Money> & { longName?: string; shortName?: string };
  const sd = (r.summaryDetail ?? {}) as Record<string, Money>;
  const fd = (r.financialData ?? {}) as Record<string, Money>;
  const ap = (r.assetProfile ?? {}) as Record<string, unknown>;
  return {
    symbol: symbol.replace(/\.(NS|BO)$/, ""),
    name: price.longName || price.shortName || symbol,
    sector: ap.sector as string | undefined,
    marketCap: fmt(price.marketCap) ?? fmt(sd.marketCap),
    trailingPE: fmt(sd.trailingPE),
    roe: fmt(fd.returnOnEquity),
    operatingMargin: fmt(fd.operatingMargins),
    revenueGrowth: fmt(fd.revenueGrowth),
  };
}

/** Peer comparison rows — same-sector peers surfaced first. */
export async function getPeers(symbol: string, selfSector?: string, limit = 3): Promise<PeerRow[]> {
  const syms = (await getPeerSymbols(symbol, 6)).slice(0, 4);
  if (!syms.length) return [];
  // Bounded concurrency: 4 simultaneous crumb calls is exactly the burst that
  // gets us throttled. Two at a time is plenty (results are cached 12h).
  const rows = (await mapLimit(syms, 2, getPeerFundamentals)).filter(
    (r): r is PeerRow => r !== null,
  );
  if (selfSector) {
    const same = rows.filter((r) => r.sector === selfSector);
    const rest = rows.filter((r) => r.sector !== selfSector);
    return [...same, ...rest].slice(0, limit);
  }
  return rows.slice(0, limit);
}

// ---- earnings history, statements, named holders (all free via crumb) -----

export type EarningsRow = {
  quarter: string;
  actual: number;
  estimate: number;
  surprisePct: string;
  beat: boolean;
};
export type StatementRow = {
  period: string;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
};
export type Holder = { name: string; pct?: string };
export type Extras = {
  earnings: EarningsRow[];
  statements: StatementRow[];
  holders: Holder[];
  currency: string;
};

/** Compact money formatter for statement figures (₹2.67T style). */
export function fmtCompact(n: number | undefined, currency = "INR"): string {
  if (n == null || !isFinite(n)) return "—";
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : "";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e7) return `${sign}${sym}${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}${sym}${(abs / 1e5).toFixed(1)}L`;
  return `${sign}${sym}${abs.toLocaleString("en-IN")}`;
}

/** One call for earnings history, income-statement history, and named holders. */
export async function getExtras(symbol: string, currency = "INR"): Promise<Extras> {
  const empty: Extras = { earnings: [], statements: [], holders: [], currency };
  const r = await quoteSummary(symbol, [
    "earningsHistory",
    "incomeStatementHistory",
    "institutionOwnership",
  ]);
  if (!r) return empty;

  const eh = (r.earningsHistory as { history?: Record<string, Money & { fmt?: string }>[] } | undefined)?.history ?? [];
  const earnings: EarningsRow[] = eh
    .map((h) => {
      const actual = rawOf(h.epsActual as Money);
      const estimate = rawOf(h.epsEstimate as Money);
      const surprise = (h.surprisePercent as { fmt?: string } | undefined)?.fmt;
      const quarter = (h.quarter as { fmt?: string } | undefined)?.fmt ?? "";
      if (actual == null || estimate == null) return null;
      return { quarter, actual, estimate, surprisePct: surprise ?? "", beat: actual >= estimate };
    })
    .filter((x): x is EarningsRow => x !== null);

  const inc =
    (r.incomeStatementHistory as { incomeStatementHistory?: Record<string, Money & { fmt?: string }>[] } | undefined)
      ?.incomeStatementHistory ?? [];
  const statements: StatementRow[] = inc.map((s) => ({
    period: (s.endDate as { fmt?: string } | undefined)?.fmt?.slice(0, 4) ?? "",
    revenue: rawOf(s.totalRevenue as Money),
    grossProfit: rawOf(s.grossProfit as Money),
    operatingIncome: rawOf(s.operatingIncome as Money),
    netIncome: rawOf(s.netIncome as Money),
  }));

  const io = (r.institutionOwnership as { ownershipList?: Record<string, unknown>[] } | undefined)?.ownershipList ?? [];
  const holders: Holder[] = io
    .slice(0, 6)
    .map((h) => ({
      name: String(h.organization ?? ""),
      pct: (h.pctHeld as { fmt?: string } | undefined)?.fmt,
    }))
    .filter((h) => h.name);

  return { earnings, statements, holders, currency };
}

// ---- technical indicators (computed from real daily closes) ---------------

export type Indicators = {
  rsi14?: number;
  macd?: "bullish" | "bearish";
  maCross?: "golden" | "death" | "neutral";
  fiftyDay?: number;
  twoHundredDay?: number;
};

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(closes: number[], period = 14): number | undefined {
  if (closes.length < period + 1) return undefined;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

export async function getIndicators(
  symbol: string,
  fiftyDayAvg?: number,
  twoHundredDayAvg?: number,
  price?: number,
): Promise<Indicators> {
  const closes = await getDailyCloses(symbol); // daily closes, keyless
  const out: Indicators = { fiftyDay: fiftyDayAvg, twoHundredDay: twoHundredDayAvg };

  if (closes && closes.length > 26) {
    out.rsi14 = rsi(closes);
    const e12 = ema(closes, 12);
    const e26 = ema(closes, 26);
    const macdLine = e12.map((v, i) => v - e26[i]);
    const signal = ema(macdLine, 9);
    const last = macdLine.length - 1;
    out.macd = macdLine[last] >= signal[last] ? "bullish" : "bearish";
  }
  if (fiftyDayAvg && twoHundredDayAvg) {
    out.maCross = fiftyDayAvg > twoHundredDayAvg ? "golden" : fiftyDayAvg < twoHundredDayAvg ? "death" : "neutral";
  }
  if (price != null && fiftyDayAvg == null) out.fiftyDay = undefined;
  return out;
}
