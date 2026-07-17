import type { Metadata } from "next";
import Link from "next/link";
import { getFundCore, getNav, simulateSip, fmtDate, RISK_FREE_PCT, type FundData } from "@/lib/mf";
import { getComparison } from "@/lib/mf-ai";
import Disclaimer from "@/components/Disclaimer";
import ComparePicker from "@/components/fund/ComparePicker";
import { MAX_COMPARE_FUNDS as MAX_FUNDS } from "@/lib/mf-config";
import { DemoBadge } from "@/components/intel/ui";

// No `revalidate` here on purpose: this page's output depends entirely on the
// query string, and the underlying fund/AI data is already cached 12h in its own
// layers. Caching the page itself would serve one comparison for every query.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Compare mutual funds — side by side",
  description:
    "Compare up to four Indian mutual funds on real returns, risk, drawdown, benchmark behaviour, SIP outcomes and the Direct-vs-Regular cost drag. Computed from AMFI NAV data. Educational only.",
};

const SIP_MONTHLY = 5000;
const SIP_YEARS = 5;

const shortName = (n: string) =>
  n
    .replace(/\b(direct|regular)\s*(plan)?\b/gi, "")
    .replace(/\b(growth|idcw|dividend)\s*(option|plan|payout|reinvestment)?\b/gi, "")
    .split(/[-–—]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" - ")
    .replace(/\s{2,}/g, " ")
    .trim();

const inrCompact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return "₹" + Math.round(n).toLocaleString("en-IN");
};

type Row = {
  label: string;
  vals: (number | null)[];
  fmt: (v: number) => string;
  /** Which direction is genuinely better; omitted where "better" is a judgement. */
  better?: "high" | "low";
  note?: string;
};

function Table({ rows, funds, title }: { rows: Row[]; funds: FundData[]; title: string }) {
  return (
    <div className="mt-6">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">{title}</p>
      <div className="glass scroll-thin mt-2 overflow-x-auto p-1">
        <table className="w-full text-sm" style={{ minWidth: `${14 + funds.length * 9}rem` }}>
          <tbody>
            {rows.map((r) => {
              const nums = r.vals.filter((v): v is number => v !== null);
              const best =
                r.better && nums.length > 1 ? (r.better === "high" ? Math.max(...nums) : Math.min(...nums)) : null;
              return (
                <tr key={r.label} className="border-b border-white/5 last:border-0">
                  <th scope="row" className="w-44 px-4 py-2.5 text-left align-top font-normal">
                    <span className="text-xs text-text-dim">{r.label}</span>
                    {r.note && <span className="mt-0.5 block text-[0.6rem] leading-snug text-text-mute">{r.note}</span>}
                  </th>
                  {r.vals.map((v, i) => {
                    const isBest = best !== null && v === best;
                    return (
                      <td key={i} className="px-4 py-2.5">
                        <span
                          className={`tabular font-mono text-sm ${
                            v === null ? "text-text-mute" : isBest ? "font-bold text-emerald-300" : "font-semibold text-white"
                          }`}
                        >
                          {v === null ? "—" : r.fmt(v)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Bullets({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-text-dim">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span className="leading-relaxed">{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ f?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = sp.f === undefined ? [] : Array.isArray(sp.f) ? sp.f : [sp.f];
  const codes = [...new Set(raw.map(Number).filter((n) => Number.isFinite(n)))].slice(0, MAX_FUNDS);

  // getFundCore, not getFund: peers aren't rendered here and fetching them would
  // cost six extra NAV histories per fund.
  const loaded = (await Promise.all(codes.map((c) => getFundCore(c)))).filter((f): f is FundData => f !== null);
  const chosen = loaded.map((f) => ({ code: f.meta.code, name: shortName(f.meta.name) }));

  const pick = (f: FundData, label: string) => f.returns.find((r) => r.label === label)?.fund ?? null;

  const [navs, ai] = await Promise.all([
    Promise.all(loaded.map((f) => getNav(f.meta.code))),
    loaded.length >= 2 ? getComparison(loaded) : Promise.resolve(null),
  ]);
  const sips = navs.map((n) => (n ? simulateSip(n, SIP_MONTHLY, SIP_YEARS) : null));

  const p2 = (v: number) => `${v.toFixed(2)}%`;
  const p1 = (v: number) => `${v.toFixed(1)}%`;
  const n2 = (v: number) => v.toFixed(2);

  const returnRows: Row[] = (["1Y", "3Y", "5Y", "10Y", "Inception"] as const).map((l) => ({
    label: l === "Inception" ? "Since inception" : `${l}${l === "1Y" ? "" : " CAGR"}`,
    vals: loaded.map((f) => pick(f, l)),
    fmt: p2,
    better: "high",
  }));

  const riskRows: Row[] = [
    { label: "Volatility", vals: loaded.map((f) => f.risk?.vol ?? null), fmt: p1, better: "low", note: "Annualised" },
    { label: "Sharpe", vals: loaded.map((f) => f.risk?.sharpe ?? null), fmt: n2, better: "high", note: `vs ${RISK_FREE_PCT.toFixed(1)}% risk-free` },
    { label: "Sortino", vals: loaded.map((f) => f.risk?.sortino ?? null), fmt: n2, better: "high", note: "Downside risk only" },
    { label: "Max drawdown", vals: loaded.map((f) => f.risk?.maxDD ?? null), fmt: p1, better: "high", note: "Worst peak-to-trough" },
    { label: "Worst 1 year", vals: loaded.map((f) => f.risk?.worst1Y ?? null), fmt: p1, better: "high", note: "Rolling, any start" },
  ];

  const benchRows: Row[] = [
    { label: "Beta", vals: loaded.map((f) => f.bench?.beta ?? null), fmt: n2, note: "1.0 = moves with the index" },
    { label: "Alpha", vals: loaded.map((f) => f.bench?.alpha ?? null), fmt: p2, better: "high", note: "Annualised, risk-adjusted" },
    { label: "Upside capture", vals: loaded.map((f) => f.bench?.upCapture ?? null), fmt: (v) => `${v.toFixed(0)}%`, better: "high" },
    { label: "Downside capture", vals: loaded.map((f) => f.bench?.downCapture ?? null), fmt: (v) => `${v.toFixed(0)}%`, better: "low" },
    { label: "Positive 3y windows", vals: loaded.map((f) => f.rolling?.positivePct ?? null), fmt: (v) => `${v.toFixed(0)}%`, better: "high", note: "Consistency" },
  ];

  const costRows: Row[] = [
    {
      label: "Direct vs Regular",
      vals: loaded.map((f) => f.drag?.rows[f.drag.rows.length - 1]?.drag ?? null),
      fmt: (v) => `${v.toFixed(2)}%/yr`,
      better: "low",
      note: "Commission, derived from NAV",
    },
    {
      label: `SIP ₹${SIP_MONTHLY.toLocaleString("en-IN")}/mo · ${SIP_YEARS}y`,
      vals: sips.map((s) => s?.value ?? null),
      fmt: inrCompact,
      better: "high",
      note: `On ${inrCompact(SIP_MONTHLY * 12 * SIP_YEARS)} invested`,
    },
    { label: "SIP XIRR", vals: sips.map((s) => s?.xirr ?? null), fmt: p2, better: "high" },
  ];

  return (
    <div className="full-bleed -my-8 sm:-my-10">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <p className="kicker mb-3">Fund comparison</p>
        <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          Side by side, <span className="text-violet-300">honestly</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-dim">
          Up to {MAX_FUNDS} funds on the numbers that actually differ between them.
          Green marks the better figure where &ldquo;better&rdquo; is unambiguous — beta has no
          winner, so it isn&apos;t marked.
        </p>

        <div className="mt-6">
          <ComparePicker chosen={chosen} />
        </div>

        {loaded.length < 2 ? (
          <div className="glass mt-8 p-8 text-center">
            <p className="text-sm text-text-dim">
              Add {loaded.length === 0 ? "two funds" : "one more fund"} to compare.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                { codes: [122639, 118955], label: "PPFAS vs HDFC Flexi Cap" },
                { codes: [122639, 118955, 125497], label: "Two flexi caps vs a small cap" },
              ].map((ex) => (
                <Link
                  key={ex.label}
                  href={`/fund/compare?${ex.codes.map((c) => `f=${c}`).join("&")}`}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-text-dim transition hover:border-violet-400/40 hover:text-white"
                >
                  {ex.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="glass mt-8 scroll-thin overflow-x-auto p-1">
              <table className="w-full text-sm" style={{ minWidth: `${14 + loaded.length * 9}rem` }}>
                <thead>
                  <tr>
                    <th className="w-44 px-4 py-3 text-left font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">
                      Fund
                    </th>
                    {loaded.map((f) => (
                      <th key={f.meta.code} className="px-4 py-3 text-left align-top">
                        <Link href={`/fund/${f.meta.code}`} className="text-sm font-semibold leading-snug text-white hover:text-violet-300">
                          {shortName(f.meta.name)}
                        </Link>
                        <span className="mt-1 block font-mono text-[0.55rem] uppercase tracking-wider text-text-mute">
                          {f.meta.house.replace(/ Mutual Fund$/, "")} · {f.meta.plan}
                        </span>
                        <span className="mt-1.5 block font-mono text-xs font-bold text-white">₹{f.latest.v.toFixed(2)}</span>
                        <span className="block font-mono text-[0.5rem] uppercase tracking-wider text-text-mute">
                          {f.meta.category.replace(/^.*?-\s*/, "")}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            <Table title="Returns" rows={returnRows} funds={loaded} />
            <Table title="Risk" rows={riskRows} funds={loaded} />
            <Table title="Against the Nifty 50" rows={benchRows} funds={loaded} />
            <Table title="Cost & SIP outcome" rows={costRows} funds={loaded} />

            {/* Reported either way: silently dropping the section would leave a
                reader unaware it exists, and the rest of the site states its AI
                status rather than hiding it. */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">How they actually differ</p>
                <DemoBadge label={ai ? "AI analysis" : "AI offline"} />
              </div>
              {!ai ? (
                <div className="glass p-5">
                  <p className="text-sm text-text-mute">
                    The AI read is unavailable right now — every figure above is
                    computed from AMFI&apos;s NAV data and is unaffected.
                  </p>
                </div>
              ) : (
                <>
                  <div className="glass p-5">
                    <p className="text-sm leading-relaxed text-text-dim">{ai.verdict}</p>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="glass rail p-5" style={{ ["--rail" as string]: "#38bdf8" }}>
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-sky-300">Key differences</p>
                      <div className="mt-3">
                        <Bullets items={ai.differences} dot="bg-sky-400" />
                      </div>
                    </div>
                    <div className="glass rail p-5" style={{ ["--rail" as string]: "#fbbf24" }}>
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-amber-300">What each asks you to accept</p>
                      <div className="mt-3">
                        <Bullets items={ai.tradeoffs} dot="bg-amber-400" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="glass mt-6 p-5">
              <p className="text-xs leading-relaxed text-text-mute">
                Comparing funds from different categories is apples-to-oranges — a small
                cap should out-return a debt fund and should also fall much harder.
                Max drawdown and worst-year are marked with &ldquo;less negative is better&rdquo;.
                Holdings and sector allocation aren&apos;t shown because no free feed publishes
                them, so this can&apos;t tell you how much two funds overlap. NAV as of{" "}
                {fmtDate(loaded[0].latest.t)}. Educational only, not investment advice.
              </p>
            </div>
          </>
        )}

        <div className="mt-8">
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
