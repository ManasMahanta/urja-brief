// 01 — fund overview. NAV is AMFI's T+1 publication, so this deliberately says
// "as of <date>" rather than borrowing the live-price language of the stock page.

import type { FundData } from "@/lib/mf";
import { fmtDate } from "@/lib/mf";

function Chart({ points }: { points: { t: number; v: number }[] }) {
  if (points.length < 2) return null;
  const w = 100;
  const h = 34;
  const vs = points.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${(h - ((p.v - min) / span) * (h - 2) - 1).toFixed(2)}`).join(" ");
  const up = points[points.length - 1].v >= points[0].v;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-16 w-full" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" className={up ? "text-emerald-400" : "text-rose-400"} />
    </svg>
  );
}

export default function FundHero({ f }: { f: FundData }) {
  const chg = f.prev ? ((f.latest.v / f.prev.v - 1) * 100) : null;
  const cat = f.meta.category.replace(/^.*?-\s*/, "");

  return (
    <section id="overview" className="scroll-mt-32">
      <div className="glass overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.5fr_1fr] sm:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-violet-300">
                {cat}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-dim">
                {f.meta.plan} plan
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">
                {f.meta.house.replace(/ Mutual Fund$/, "")}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">{f.meta.name}</h1>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="tabular font-mono text-4xl font-bold text-white">₹{f.latest.v.toFixed(4)}</span>
              {chg !== null && (
                <span className={`tabular font-mono text-lg font-semibold ${chg >= 0 ? "text-up" : "text-down"}`}>
                  {chg >= 0 ? "+" : ""}
                  {chg.toFixed(2)}%
                </span>
              )}
            </div>
            <p className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-mute">
              NAV as of {fmtDate(f.latest.t)} · AMFI publishes T+1
            </p>
          </div>

          <div className="flex flex-col justify-between gap-3">
            <Chart points={f.chart} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">Since inception</p>
                <p className="tabular mt-0.5 font-mono text-sm font-semibold text-white">{fmtDate(f.inception)}</p>
              </div>
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">ISIN</p>
                <p className="tabular mt-0.5 truncate font-mono text-sm font-semibold text-white">{f.meta.isin ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
