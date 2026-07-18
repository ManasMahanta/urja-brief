import { getDuckCurve, type DuckPoint } from "@/lib/duck";
import ExplainButton from "@/components/urja/ExplainButton";

const W = 560;
const H = 210;
const PAD = { top: 14, right: 16, bottom: 26, left: 46 };
const DEMAND = "#64748b"; // gross demand — recessive slate
const NETLOAD = "#0891b2"; // the duck (net of solar) — cyan
const SOLAR = "#d97706"; // solar fill — amber

const istMinutes = (iso: string) => {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(iso)).split(":");
  return Number(h) * 60 + Number(m);
};
const istClock = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const mw = (v: number) => `${Math.round(v).toLocaleString("en-IN")} MW`;

export default async function DuckCurve() {
  const duck = await getDuckCurve();

  if (!duck) {
    return (
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">The duck curve</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Not enough of today&apos;s samples yet to draw the net-load curve. It fills in as the
          15-minute sampler works through the day — no synthetic shape is drawn meanwhile.
        </p>
      </section>
    );
  }

  const { points, eveningRamp } = duck;
  const values = points.flatMap((p) => [p.demandMw, p.netLoadMw]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.12, hi * 0.02);
  const min = Math.max(0, lo - pad);
  const max = hi + pad;

  const x = (mins: number) => PAD.left + (mins / 1440) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);
  const line = (pick: (p: DuckPoint) => number) =>
    points.map((p, i) => `${i ? "L" : "M"}${x(istMinutes(p.t)).toFixed(1)} ${y(pick(p)).toFixed(1)}`).join(" ");
  // Solar area = between demand (top) and net load (bottom).
  const area =
    points.map((p, i) => `${i ? "L" : "M"}${x(istMinutes(p.t)).toFixed(1)} ${y(p.demandMw).toFixed(1)}`).join(" ") +
    " " +
    [...points].reverse().map((p) => `L${x(istMinutes(p.t)).toFixed(1)} ${y(p.netLoadMw).toFixed(1)}`).join(" ") +
    " Z";
  const ticks = [min, (min + max) / 2, max];

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">The duck curve — today</p>
        <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          demand minus estimated solar
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Solar carves a belly out of midday demand; then it sets, and the grid must ramp hard into the
        evening peak.
        {eveningRamp
          ? ` Today the net load climbed about ${mw(eveningRamp.mw)} from ${istClock(eveningRamp.fromT)} to ${istClock(eveningRamp.toT)} — the ramp coal and hydro cover.`
          : ""}
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Demand and net-load-of-solar through the day">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="monospace">{Math.round(t / 1000)}k</text>
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((h) => (
          <text key={h} x={x(h * 60)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="monospace">{String(h).padStart(2, "0")}</text>
        ))}
        <path d={area} fill={SOLAR} fillOpacity="0.16" stroke="none" />
        <path d={line((p) => p.demandMw)} fill="none" stroke={DEMAND} strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
        <path d={line((p) => p.netLoadMw)} fill="none" stroke={NETLOAD} strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.t} cx={x(istMinutes(p.t))} cy={y(p.netLoadMw)} r="6" fill="transparent">
            <title>{`${istClock(p.t)} IST — net load ${mw(p.netLoadMw)}, solar ${mw(p.solarMw)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded" style={{ background: `repeating-linear-gradient(90deg, ${DEMAND} 0 4px, transparent 4px 7px)` }} /> Total demand</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded" style={{ background: NETLOAD }} /> Net load (after solar)</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SOLAR, opacity: 0.4 }} /> Solar fills the gap</span>
      </div>

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Solar is estimated (the renewable reading above its night-time floor), so the belly&apos;s
        depth is approximate. The shape — midday dip, evening ramp — is the real story, and it&apos;s
        why the evening peak leans on coal.
      </p>
      <div className="mt-3">
        <ExplainButton section="duck-curve" />
      </div>
    </section>
  );
}
