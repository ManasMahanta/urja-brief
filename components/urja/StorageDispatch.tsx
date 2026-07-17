import { getGridSnapshot } from "@/lib/grid-live";
import { getLoadCurves } from "@/lib/samples";

// Live storage dispatch from MERIT plus today's sampled storage curve.
// The honest headline: grid-scale storage barely registers on the live grid
// yet — this card shows the real number rather than the tender pipeline, and
// will quietly become more interesting as the number grows.

const SW = 560;
const SH = 120;
const PAD = { top: 10, right: 12, bottom: 20, left: 40 };

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

const istClock = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export default async function StorageDispatch() {
  const [snapshot, curves] = await Promise.all([getGridSnapshot(), getLoadCurves()]);
  const storageNow = snapshot ? snapshot.mix.storage : null;
  const sharePct =
    snapshot && snapshot.totalGenerationMw > 0
      ? (snapshot.mix.storage / snapshot.totalGenerationMw) * 100
      : null;

  const points = curves.today.filter((sample) => typeof sample.mix?.storage === "number");
  const max = Math.max(10, ...points.map((sample) => sample.mix.storage));
  const sx = (minutes: number) => PAD.left + (minutes / 1440) * (SW - PAD.left - PAD.right);
  const sy = (value: number) => PAD.top + (1 - value / max) * (SH - PAD.top - PAD.bottom);
  const path = points
    .map((sample, i) => `${i ? "L" : "M"}${sx(istMinutes(sample.t)).toFixed(1)} ${sy(sample.mix.storage).toFixed(1)}`)
    .join(" ");

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Storage on the grid, right now</p>
        <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          MERIT · instantaneous MW
        </span>
      </div>

      {storageNow !== null && snapshot ? (
        <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-sm text-slate-400">Storage despatch</p>
            <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-white">
              {Math.round(storageNow).toLocaleString("en-IN")}
              <span className="ml-2 text-lg font-normal text-slate-400">MW</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Share of current generation</p>
            <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-cyan-300">
              {sharePct !== null && sharePct < 0.1 && storageNow > 0 ? "<0.1" : sharePct?.toFixed(1)}
              <span className="ml-1 text-lg font-normal text-slate-400">%</span>
            </p>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-slate-500">
            For scale: thermal is despatching{" "}
            {Math.round(snapshot.mix.thermal).toLocaleString("en-IN")} MW at the same instant. That
            gap is the whole storage story.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          MERIT is unavailable right now — no cached or estimated figure is shown in its place.
        </p>
      )}

      {points.length >= 2 && (
        <div className="mt-6">
          <p className="text-xs font-medium text-slate-400">Today&apos;s sampled storage despatch (MW)</p>
          <svg viewBox={`0 0 ${SW} ${SH}`} className="mt-2 w-full" role="img" aria-label="Storage despatch today, sampled every 15 minutes">
            {[0, max].map((tick) => (
              <g key={tick}>
                <line x1={PAD.left} x2={SW - PAD.right} y1={sy(tick)} y2={sy(tick)} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
                <text x={PAD.left - 6} y={sy(tick) + 3} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="monospace">
                  {Math.round(tick)}
                </text>
              </g>
            ))}
            {[0, 6, 12, 18, 24].map((hour) => (
              <text key={hour} x={sx(hour * 60)} y={SH - 6} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="monospace">
                {String(hour).padStart(2, "0")}
              </text>
            ))}
            <path d={path} fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
            {points.map((sample) => (
              <circle key={sample.t} cx={sx(istMinutes(sample.t))} cy={sy(sample.mix.storage)} r="6" fill="transparent">
                <title>{`${istClock(sample.t)} IST — ${sample.mix.storage} MW`}</title>
              </circle>
            ))}
          </svg>
        </div>
      )}

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        MERIT&apos;s &ldquo;storage&rdquo; line is instantaneous despatch at fetch time — it says
        nothing about installed capacity, energy stored, or charging. A low number is despatch
        economics, not a verdict on the technology.
      </p>
    </section>
  );
}
