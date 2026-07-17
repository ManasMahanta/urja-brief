// Phase-2 sections, all free: Earnings Intelligence + 5yr Financial Statements
// (real, Yahoo crumb) and Business Intelligence (moat / supply chain / M&A,
// AI-derived, badged).

import type { Dissection } from "@/lib/stock-ai";
import type { Extras } from "@/lib/yahoo-fundamentals";
import { fmtCompact } from "@/lib/yahoo-fundamentals";
import Block from "@/components/stock/Block";
import { Reveal } from "@/components/cinematic/Motion";
import { LiveBadge, DemoBadge } from "@/components/intel/ui";

/* --- 12. Earnings Intelligence (real beat history) --------------------- */
export function EarningsIntel({ extras }: { extras: Extras }) {
  const rows = [...extras.earnings].reverse(); // oldest → newest
  const beats = rows.filter((r) => r.beat).length;
  const maxSurprise = Math.max(1, ...rows.map((r) => Math.abs(parseFloat(r.surprisePct) || 0)));
  return (
    <Block id="earnings" index="12" kicker="Earnings intelligence" title="Beat history" badge={rows.length ? <LiveBadge /> : <DemoBadge label="Unavailable" />}>
      {rows.length ? (
        <div className="glass p-5">
          <p className="text-sm text-text-dim">
            Beat estimates in <span className="font-semibold text-white">{beats} of {rows.length}</span> recent quarters (EPS actual vs. consensus).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((r) => {
              const s = parseFloat(r.surprisePct) || 0;
              return (
                <div key={r.quarter} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.62rem] uppercase tracking-wider text-text-mute">{r.quarter}</span>
                    <span className={`rounded border px-1.5 py-0.5 font-mono text-[0.55rem] font-semibold uppercase ${r.beat ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-rose-400/25 bg-rose-400/10 text-rose-200"}`}>
                      {r.beat ? "Beat" : "Miss"}
                    </span>
                  </div>
                  <p className="tabular mt-2 font-mono text-sm text-white">
                    {r.actual} <span className="text-text-mute">vs {r.estimate}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full ${s >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                      style={{ width: `${Math.min(100, (Math.abs(s) / maxSurprise) * 100)}%` }}
                    />
                  </div>
                  <p className={`mt-1 text-xs ${s >= 0 ? "text-up" : "text-down"}`}>{r.surprisePct || "—"} surprise</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="glass p-5 text-sm text-text-mute">Earnings history unavailable for this symbol.</p>
      )}
    </Block>
  );
}

/* --- 07b. Financial Statements (real 4-5yr trend) ---------------------- */
function TrendRow({ label, values, currency }: { label: string; values: (number | undefined)[]; currency: string }) {
  const nums = values.filter((v): v is number => typeof v === "number");
  const max = Math.max(1, ...nums.map((v) => Math.abs(v)));
  return (
    <div className="grid grid-cols-[8rem_1fr] items-center gap-3 py-2.5">
      <span className="text-xs text-text-mute">{label}</span>
      <div className="flex items-end gap-2">
        {values.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="tabular font-mono text-[0.62rem] text-text-dim">{fmtCompact(v, currency)}</span>
            <div className="flex h-12 w-full items-end">
              <div
                className={`w-full rounded-t ${(v ?? 0) >= 0 ? "bg-gradient-to-t from-sky-500/40 to-cyan-400/80" : "bg-rose-400/60"}`}
                style={{ height: `${v != null ? Math.max(4, (Math.abs(v) / max) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancialStatements({ extras }: { extras: Extras }) {
  const s = [...extras.statements].reverse(); // oldest → newest
  const periods = s.map((r) => r.period);
  return (
    <Block id="statements" index="07b" kicker="Financial statements" title="Multi-year trend" badge={s.length ? <LiveBadge /> : <DemoBadge label="Unavailable" />}>
      {s.length ? (
        <div className="glass p-5">
          <div className="grid grid-cols-[8rem_1fr] gap-3 border-b border-white/10 pb-2">
            <span className="font-mono text-[0.58rem] uppercase tracking-wider text-text-mute">Line item</span>
            <div className="flex justify-around font-mono text-[0.58rem] uppercase tracking-wider text-text-mute">
              {periods.map((p) => (
                <span key={p}>{p}</span>
              ))}
            </div>
          </div>
          <div className="mt-1 divide-y divide-white/8">
            <TrendRow label="Revenue" values={s.map((r) => r.revenue)} currency={extras.currency} />
            <TrendRow label="Gross profit" values={s.map((r) => r.grossProfit)} currency={extras.currency} />
            <TrendRow label="Operating income" values={s.map((r) => r.operatingIncome)} currency={extras.currency} />
            <TrendRow label="Net income" values={s.map((r) => r.netIncome)} currency={extras.currency} />
          </div>
          <p className="mt-3 text-[0.68rem] text-text-mute">Annual income statement, oldest → newest. Live via Yahoo.</p>
        </div>
      ) : (
        <p className="glass p-5 text-sm text-text-mute">Statement history unavailable for this symbol.</p>
      )}
    </Block>
  );
}

/* --- 16/19. Business Intelligence (AI: moat / supply chain / M&A) ------- */
export function BusinessIntel({ d, live }: { d: Dissection; live: boolean }) {
  const sc = d.supplyChain;
  const hasSc = sc.upstream.length || sc.downstream.length;
  return (
    <Block id="business" index="16" kicker="Business intelligence" title="Moat · supply chain · M&A" badge={<DemoBadge label={live ? "AI analysis" : "AI offline"} />}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal>
          <div className="glass rail h-full p-5" style={{ ["--rail" as string]: "#34d399" }}>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-emerald-300">Competitive moat</p>
            <p className="mt-3 text-sm leading-relaxed text-text-dim">{d.moat}</p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="glass h-full p-5">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-sky-300">Supply chain</p>
            {hasSc ? (
              <div className="mt-3 space-y-3 text-xs">
                <div>
                  <p className="text-text-mute">Upstream (inputs / suppliers)</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {sc.upstream.map((u) => (
                      <span key={u} className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-text-dim">{u}</span>
                    ))}
                  </div>
                </div>
                <p className="text-center text-text-mute">↓</p>
                <div>
                  <p className="text-text-mute">Downstream (customers / markets)</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {sc.downstream.map((dn) => (
                      <span key={dn} className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-text-dim">{dn}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-text-mute">—</p>
            )}
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="glass h-full p-5">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-violet-300">M&amp;A / strategic moves</p>
            {d.mAndA.length ? (
              <ul className="mt-3 space-y-2">
                {d.mAndA.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-dim">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-text-mute">No notable recent activity flagged.</p>
            )}
          </div>
        </Reveal>
      </div>
    </Block>
  );
}
