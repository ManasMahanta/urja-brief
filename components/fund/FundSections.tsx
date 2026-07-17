// Data-driven fund sections. Everything rendered here is computed from AMFI's
// published NAV series — no estimates, no placeholders dressed up as figures.

import Link from "next/link";
import type { FundData } from "@/lib/mf";
import { RISK_FREE_PCT, fmtDate } from "@/lib/mf";
import type { FundThesis } from "@/lib/mf-ai";
import Block from "@/components/stock/Block";
import { DemoBadge } from "@/components/intel/ui";

const pct = (n: number | null, d = 2) => (n === null || !Number.isFinite(n) ? "—" : `${n >= 0 ? "" : ""}${n.toFixed(d)}%`);
const tone = (n: number | null) => (n === null ? "text-text-mute" : n >= 0 ? "text-up" : "text-down");

/** Indian grouping: 51,07,799 not 5,107,799. */
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const inrCompact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr(n);
};

function Stat({ label, value, sub, className = "" }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className="glass p-4">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">{label}</p>
      <p className={`tabular mt-1.5 font-mono text-lg font-bold ${className || "text-white"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[0.65rem] leading-snug text-text-mute">{sub}</p>}
    </div>
  );
}

/* --- 04. Returns -------------------------------------------------------- */
export function Returns({ f }: { f: FundData }) {
  return (
    <Block id="returns" index="04" kicker="Performance" title="Returns vs the index" badge={<DemoBadge label="AMFI data" />}>
      <div className="glass scroll-thin overflow-x-auto p-1">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              {["Window", "Fund", "Nifty 50", "Difference"].map((h) => (
                <th key={h} className="px-4 py-3 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {f.returns.map((r) => {
              const diff = r.fund !== null && r.bench !== null ? r.fund - r.bench : null;
              return (
                <tr key={r.label} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs text-text-dim">
                    {r.label}
                    {r.years >= 1 && <span className="ml-1 text-[0.55rem] text-text-mute">CAGR</span>}
                  </td>
                  <td className={`tabular px-4 py-2.5 font-mono font-semibold ${tone(r.fund)}`}>{pct(r.fund)}</td>
                  <td className={`tabular px-4 py-2.5 font-mono ${tone(r.bench)}`}>{pct(r.bench)}</td>
                  <td className={`tabular px-4 py-2.5 font-mono ${tone(diff)}`}>
                    {diff === null ? "—" : `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-text-mute">
        Windows under 1 year are absolute; 1 year and beyond are annualised (CAGR).
        Only windows the fund has actually lived through are shown. Past performance
        does not indicate future returns.
      </p>
    </Block>
  );
}

/* --- 06. Risk ----------------------------------------------------------- */
export function Risk({ f }: { f: FundData }) {
  const k = f.risk;
  if (!k) return null;
  return (
    <Block id="risk" index="06" kicker="Risk profile" title="What it costs to hold" badge={<DemoBadge label="Computed" />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Volatility" value={`${k.vol.toFixed(1)}%`} sub="Annualised, daily NAV" />
        <Stat label="Sharpe" value={k.sharpe.toFixed(2)} sub={`Excess return per unit of risk`} className={k.sharpe >= 1 ? "text-up" : "text-white"} />
        <Stat label="Sortino" value={k.sortino.toFixed(2)} sub="Downside risk only" className={k.sortino >= 1 ? "text-up" : "text-white"} />
        <Stat label="Max drawdown" value={`${k.maxDD.toFixed(1)}%`} sub={`${k.maxDDFrom} → ${k.maxDDTo}`} className="text-down" />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Recovery"
          value={k.recoveryDays === null ? "Not yet" : `${k.recoveryDays} days`}
          sub={k.recoveryDays === null ? "Still below the prior peak" : "To reclaim the prior peak"}
        />
        <Stat label="Best 1 year" value={pct(k.best1Y, 1)} sub="Rolling, any start date" className="text-up" />
        <Stat label="Worst 1 year" value={pct(k.worst1Y, 1)} sub="Rolling, any start date" className="text-down" />
      </div>
      <p className="mt-3 text-xs text-text-mute">
        Sharpe and Sortino assume a {RISK_FREE_PCT.toFixed(1)}% risk-free rate (~Indian 1-year T-bill).
      </p>
    </Block>
  );
}

/* --- 07. Rolling returns ------------------------------------------------ */
export function Rolling({ f }: { f: FundData }) {
  const r = f.rolling;
  if (!r) return null;
  const span = r.max - r.min || 1;
  const at = (v: number) => ((v - r.min) / span) * 100;
  return (
    <Block id="rolling" index="07" kicker="Consistency" title="Not just one lucky window" badge={<DemoBadge label="Computed" />}>
      <div className="glass p-6">
        <p className="text-sm text-text-dim">
          Every {r.years}-year holding period since inception — {r.count} overlapping windows.
          This is what the fund returned depending on <em className="text-white not-italic">when</em> you happened to buy.
        </p>
        <div className="relative mt-6 h-2 rounded-full bg-white/[0.06]">
          <div
            className="absolute inset-y-0 rounded-full bg-gradient-to-r from-rose-400/40 via-sky-400/40 to-emerald-400/50"
            style={{ left: 0, right: 0 }}
          />
          <div className="absolute -top-1 h-4 w-0.5 rounded bg-white" style={{ left: `${at(r.median)}%` }} />
        </div>
        <div className="mt-3 flex justify-between font-mono text-[0.6rem] uppercase tracking-wider">
          <span className="text-down">worst {r.min.toFixed(1)}%</span>
          <span className="text-white">median {r.median.toFixed(1)}%</span>
          <span className="text-up">best {r.max.toFixed(1)}%</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Stat
            label={`Positive ${r.years}y windows`}
            value={`${r.positivePct.toFixed(0)}%`}
            sub={`Of ${r.count} windows tested`}
            className={r.positivePct >= 90 ? "text-up" : "text-white"}
          />
          <Stat label={`Median ${r.years}y CAGR`} value={`${r.median.toFixed(1)}%`} sub="The typical outcome, not the best one" />
        </div>
      </div>
    </Block>
  );
}

/* --- 08. Benchmark ------------------------------------------------------ */
export function Benchmark({ f }: { f: FundData }) {
  const b = f.bench;
  if (!b) return null;
  return (
    <Block id="benchmark" index="08" kicker="Vs Nifty 50" title="How it behaves against the index" badge={<DemoBadge label="Computed" />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Beta" value={b.beta.toFixed(2)} sub={b.beta < 0.9 ? "Moves less than the index" : b.beta > 1.1 ? "Moves more than the index" : "Tracks the index"} />
        <Stat label="Alpha" value={`${b.alpha >= 0 ? "+" : ""}${b.alpha.toFixed(2)}%`} sub="Annualised, risk-adjusted" className={b.alpha >= 0 ? "text-up" : "text-down"} />
        <Stat label="Correlation" value={b.correlation.toFixed(2)} sub="1.0 = moves in lockstep" />
        <Stat label="Upside capture" value={`${b.upCapture.toFixed(0)}%`} sub="Of index gains captured" className="text-up" />
        <Stat label="Downside capture" value={`${b.downCapture.toFixed(0)}%`} sub="Of index falls absorbed" className={b.downCapture < 100 ? "text-up" : "text-down"} />
      </div>
      <p className="mt-3 text-xs text-text-mute">
        Capture below 100% on the downside and above it on the upside is the pattern
        investors pay for. Alpha assumes a {RISK_FREE_PCT.toFixed(1)}% risk-free rate.
        Nifty 50 is a broad-market reference, not necessarily this fund&apos;s stated benchmark.
      </p>
    </Block>
  );
}

/* --- 09. Cost ----------------------------------------------------------- */
export function Cost({ f }: { f: FundData }) {
  const d = f.drag;
  if (!d) return null;
  const l = d.lumpsum;
  return (
    <Block id="cost" index="09" kicker="Cost of advice" title="Direct vs Regular" badge={<DemoBadge label="Derived from NAV" />}>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass scroll-thin overflow-x-auto p-1">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {["Window", "Direct", "Regular", "Drag"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.years} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs text-text-dim">{r.years}Y</td>
                  <td className="tabular px-4 py-2.5 font-mono font-semibold text-white">{r.direct.toFixed(2)}%</td>
                  <td className="tabular px-4 py-2.5 font-mono text-text-dim">{r.regular.toFixed(2)}%</td>
                  <td className="tabular px-4 py-2.5 font-mono font-semibold text-amber-300">{r.drag.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {l && (
          <div className="glass rail p-5" style={{ ["--rail" as string]: "#fbbf24" }}>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-mute">
              ₹10,00,000 held {l.years} years
            </p>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-mute">Direct plan</span>
                <span className="tabular font-mono text-sm font-semibold text-up">{inrCompact(l.direct)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-mute">Regular plan</span>
                <span className="tabular font-mono text-sm font-semibold text-text-dim">{inrCompact(l.regular)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                <span className="text-xs text-white">Cost of Regular</span>
                <span className="tabular font-mono text-base font-bold text-down">{inrCompact(l.cost)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-text-mute">
        Both plans hold the identical portfolio, so the gap between their NAVs{" "}
        <span className="text-text-dim">is</span> the commission — measured here from
        the published NAV series, not quoted from a TER sheet. Compared against{" "}
        <Link href={`/fund/${d.siblingCode}`} className="text-sky-300 hover:underline">
          scheme {d.siblingCode}
        </Link>
        . Distributors provide advice for that fee; whether it&apos;s worth it is your call.
      </p>
    </Block>
  );
}

/* --- 10. Peers ---------------------------------------------------------- */
export function Peers({ f }: { f: FundData }) {
  if (!f.peers.length) return null;
  const self = {
    code: f.meta.code,
    name: f.meta.name,
    house: f.meta.house,
    r1: f.returns.find((r) => r.label === "1Y")?.fund ?? null,
    r3: f.returns.find((r) => r.label === "3Y")?.fund ?? null,
    r5: f.returns.find((r) => r.label === "5Y")?.fund ?? null,
    vol: f.risk?.vol ?? null,
  };
  const rows = [self, ...f.peers].sort((a, b) => (b.r3 ?? -999) - (a.r3 ?? -999));

  return (
    <Block id="peers" index="10" kicker="Category" title="Against its peers" badge={<DemoBadge label="AMFI data" />}>
      <div className="glass scroll-thin overflow-x-auto p-1">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              {["Fund", "1Y", "3Y", "5Y", "Volatility"].map((h) => (
                <th key={h} className="px-4 py-3 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const me = p.code === f.meta.code;
              return (
                <tr key={p.code} className={`border-b border-white/5 last:border-0 ${me ? "bg-violet-400/[0.07]" : ""}`}>
                  <td className="px-4 py-2.5">
                    {me ? (
                      <span className="text-sm font-semibold text-white">{p.house.replace(/ Mutual Fund$/, "")}</span>
                    ) : (
                      <Link href={`/fund/${p.code}`} className="text-sm text-text-dim transition hover:text-white">
                        {p.house.replace(/ Mutual Fund$/, "")}
                      </Link>
                    )}
                    {me && <span className="ml-2 rounded border border-violet-400/30 bg-violet-400/10 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider text-violet-300">this fund</span>}
                  </td>
                  <td className={`tabular px-4 py-2.5 font-mono ${tone(p.r1)}`}>{pct(p.r1, 1)}</td>
                  <td className={`tabular px-4 py-2.5 font-mono font-semibold ${tone(p.r3)}`}>{pct(p.r3, 1)}</td>
                  <td className={`tabular px-4 py-2.5 font-mono ${tone(p.r5)}`}>{pct(p.r5, 1)}</td>
                  <td className="tabular px-4 py-2.5 font-mono text-text-dim">{p.vol === null ? "—" : `${p.vol.toFixed(1)}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-text-mute">
        Same category ({f.meta.category}), same plan type, sorted by 3-year CAGR.
        Peers are the largest AMCs in the category by scheme count — a size proxy,
        since scheme-level AUM isn&apos;t published in a machine-readable feed.
      </p>
    </Block>
  );
}

/* --- 02 / 11. AI ------------------------------------------------------- */
function Bullets({ items, dot }: { items: string[]; dot: string }) {
  if (!items.length) return <p className="text-xs text-text-mute">—</p>;
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

export function AiBriefing({ t }: { t: FundThesis | null }) {
  return (
    <Block id="briefing" index="02" kicker="AI briefing" title="What the numbers say" badge={<DemoBadge label={t ? "AI analysis" : "AI offline"} />}>
      {!t ? (
        <p className="text-sm text-text-mute">AI briefing unavailable right now — the data sections below are unaffected.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass p-5">
            <p className="text-sm leading-relaxed text-text-dim">{t.summary}</p>
            <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-text-dim">{t.strategy}</p>
          </div>
          <div className="grid gap-3">
            <div className="glass p-4">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-emerald-300/80">Suits</p>
              <div className="mt-2">
                <Bullets items={t.suits} dot="bg-emerald-400" />
              </div>
            </div>
            <div className="glass p-4">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-rose-300/80">Not for</p>
              <div className="mt-2">
                <Bullets items={t.notFor} dot="bg-rose-400" />
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-text-mute">
        AI interpretation of the computed statistics on this page — educational, not
        advice. It has no access to portfolio holdings and is instructed not to guess at them.
      </p>
    </Block>
  );
}

export function Thesis({ t }: { t: FundThesis | null }) {
  if (!t || (!t.bull.length && !t.bear.length)) return null;
  return (
    <Block id="thesis" index="11" kicker="Both sides" title="The case for and against" badge={<DemoBadge label="AI analysis" />}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="glass rail p-5" style={{ ["--rail" as string]: "#34d399" }}>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-emerald-300">What the numbers support</p>
          <div className="mt-3">
            <Bullets items={t.bull} dot="bg-emerald-400" />
          </div>
        </div>
        <div className="glass rail p-5" style={{ ["--rail" as string]: "#fb7185" }}>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-rose-300">What they warn about</p>
          <div className="mt-3">
            <Bullets items={t.bear} dot="bg-rose-400" />
          </div>
        </div>
      </div>
    </Block>
  );
}

/* --- Gaps --------------------------------------------------------------- */
export function Gaps({ asOf }: { asOf: number }) {
  return (
    <div className="glass mt-6 p-5">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">Not shown, and why</p>
      <p className="mt-2 text-sm leading-relaxed text-text-dim">
        <span className="text-white">Portfolio holdings, sector allocation, AUM, expense ratio and the fund manager</span>{" "}
        are absent because no free machine-readable feed publishes them — SEBI mandates
        monthly disclosure, but each AMC posts its own spreadsheet. Rather than estimate
        them, this page shows only what AMFI&apos;s published NAV series can prove. The cost
        section derives the expense <em className="not-italic text-text-dim">difference</em> from
        Direct vs Regular NAVs instead.
      </p>
      <p className="mt-2 text-xs text-text-mute">NAV as of {fmtDate(asOf)} · AMFI publishes T+1 · Educational only, not investment advice.</p>
    </div>
  );
}
