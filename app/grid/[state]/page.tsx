import Link from "next/link";
import { notFound } from "next/navigation";
import { getGridSnapshot, getStateBySlug, getStateList, stateSlug } from "@/lib/grid-live";
import { getStateSeries } from "@/lib/samples";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const states = await getStateList();
  return states.map((state) => ({ state: stateSlug(state.name) }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const name = state.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${name} — Grid`,
    description: `Current power position for ${name}: demand met, own generation, and import, from the Ministry of Power's MERIT dashboard.`,
  };
}

const mw = (value: number | null) =>
  value === null ? "—" : `${Math.round(value).toLocaleString("en-IN")} MW`;

const SW = 560;
const SH = 130;
const PAD = { top: 12, right: 12, bottom: 20, left: 44 };

const istMinutes = (iso: string) => {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .split(":");
  return Number(h) * 60 + Number(m);
};

// Today's sampled demand curve for this state (major states only — the
// 15-minute sampler records a fixed list so each series stays continuous).
function StateCurve({ series, name }: { series: Array<{ t: string; demandMw: number }>; name: string }) {
  if (series.length < 2) return null;
  const values = series.map((point) => point.demandMw);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.15, hi * 0.02);
  const min = Math.max(0, lo - pad);
  const max = hi + pad;
  const sx = (minutes: number) => PAD.left + (minutes / 1440) * (SW - PAD.left - PAD.right);
  const sy = (value: number) => PAD.top + (1 - (value - min) / (max - min)) * (SH - PAD.top - PAD.bottom);
  const path = series
    .map((point, i) => `${i ? "L" : "M"}${sx(istMinutes(point.t)).toFixed(1)} ${sy(point.demandMw).toFixed(1)}`)
    .join(" ");
  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Today&apos;s demand curve</p>
        <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          Sampled every 15 min
        </span>
      </div>
      <svg viewBox={`0 0 ${SW} ${SH}`} className="mt-3 w-full" role="img" aria-label={`${name} demand met today, sampled every 15 minutes`}>
        {[min, max].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={SW - PAD.right} y1={sy(tick)} y2={sy(tick)} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
            <text x={PAD.left - 6} y={sy(tick) + 3} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="monospace">
              {`${Math.round(tick / 1000)}k`}
            </text>
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((hour) => (
          <text key={hour} x={sx(hour * 60)} y={SH - 6} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="monospace">
            {String(hour).padStart(2, "0")}
          </text>
        ))}
        <path d={path} fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
        {series.map((point) => (
          <circle key={point.t} cx={sx(istMinutes(point.t))} cy={sy(point.demandMw)} r="6" fill="transparent">
            <title>{`${new Date(point.t).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST — ${mw(point.demandMw)}`}</title>
          </circle>
        ))}
      </svg>
      <p className="mt-3 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Instantaneous MERIT readings sampled every 15 minutes; gaps mean the source was unreachable.
        Not official CEA data.
      </p>
    </section>
  );
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params;
  const [result, snapshot] = await Promise.all([getStateBySlug(slug), getGridSnapshot()]);
  if (!result) notFound();
  const { state, power } = result;
  const series = await getStateSeries(state.code);

  const nationalShare =
    power && snapshot ? (power.demandMetMw / snapshot.demandMetMw) * 100 : null;
  const importShare =
    power && power.importMw !== null && power.demandMetMw > 0
      ? (power.importMw / power.demandMetMw) * 100
      : null;

  return (
    <div className="flex flex-col gap-10 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-14">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">State desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            {state.name}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">
            The current power position as MERIT reports it — instantaneous MW at fetch time, not
            daily energy and not an official CEA record.
          </p>
        </div>
      </section>

      {power ? (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="urja-panel p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-200/70">Demand met</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">{mw(power.demandMetMw)}</p>
            {nationalShare !== null && (
              <p className="mt-2 text-xs text-slate-400">
                {nationalShare.toFixed(1)}% of all-India demand met right now
              </p>
            )}
          </article>
          <article className="urja-panel p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-200/70">Own generation</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">{mw(power.ownGenerationMw)}</p>
            <p className="mt-2 text-xs text-slate-400">Generation MERIT attributes to the state itself</p>
          </article>
          <article className="urja-panel p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-200/70">Import</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">{mw(power.importMw)}</p>
            <p className="mt-2 text-xs text-slate-400">
              {importShare !== null
                ? importShare > 0
                  ? `${importShare.toFixed(0)}% of demand met from beyond the state`
                  : "Net exporter at the moment of fetch"
                : "MERIT reported no figure"}
            </p>
          </article>
        </section>
      ) : (
        <section className="urja-panel p-6">
          <p className="text-sm leading-relaxed text-slate-400">
            MERIT&apos;s feed for {state.name} is unavailable right now. No cached or estimated
            figures are shown in its place.
          </p>
        </section>
      )}

      <StateCurve series={series} name={state.name} />

      <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-amber-200">Reading note</p>
        <p className="mt-3 text-sm leading-relaxed text-amber-100/80">
          A high import share is a market and transmission fact, not a failure: states buy power
          when that is cheaper or cleaner than generating it. Deficit claims need the official
          record — start with the CEA&apos;s daily and monthly reports, not a dashboard snapshot.
        </p>
      </section>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/grid">
        ← All states
      </Link>
    </div>
  );
}
