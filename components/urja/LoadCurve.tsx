import { getLoadCurves, type GridSample } from "@/lib/samples";
import ExplainButton from "@/components/urja/ExplainButton";
import PlainEnglish from "@/components/urja/PlainEnglish";

// Today-vs-yesterday load curve and renewable-share curve, drawn from the
// 15-minute MERIT samples in data/samples/. Two separate single-axis charts —
// MW and % never share a plot. Colors validated for the dark surface
// (#0891b2 / #d97706, CVD ΔE 19+); yesterday is additionally dashed so the
// pair never relies on color alone.

const W = 560;
const H = 190;
const PAD = { top: 14, right: 14, bottom: 26, left: 46 };
const TODAY = "#0891b2";
const YESTERDAY = "#d97706";

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

type Scale = { min: number; max: number };

const x = (minutes: number) => PAD.left + (minutes / 1440) * (W - PAD.left - PAD.right);
const y = (value: number, s: Scale) =>
  PAD.top + (1 - (value - s.min) / (s.max - s.min)) * (H - PAD.top - PAD.bottom);

function linePath(samples: GridSample[], pick: (s: GridSample) => number, s: Scale) {
  return samples
    .map((sample, i) => `${i ? "L" : "M"}${x(istMinutes(sample.t)).toFixed(1)} ${y(pick(sample), s).toFixed(1)}`)
    .join(" ");
}

function Chart({
  title,
  unit,
  today,
  yesterday,
  pick,
  format,
}: {
  title: string;
  unit: string;
  today: GridSample[];
  yesterday: GridSample[];
  pick: (s: GridSample) => number;
  format: (v: number) => string;
}) {
  const values = [...today, ...yesterday].map(pick);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.15, hi * 0.02);
  const scale: Scale = { min: Math.max(0, lo - pad), max: hi + pad };
  const ticks = [scale.min, (scale.min + scale.max) / 2, scale.max];
  const last = today[today.length - 1];

  return (
    <figure className="m-0 min-w-0">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">{unit}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`${title}, today versus yesterday`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick, scale)} y2={y(tick, scale)} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(tick, scale) + 3} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="monospace">
              {format(tick)}
            </text>
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((hour) => (
          <text key={hour} x={x(hour * 60)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="monospace">
            {String(hour).padStart(2, "0")}
          </text>
        ))}
        {yesterday.length > 1 && (
          <path d={linePath(yesterday, pick, scale)} fill="none" stroke={YESTERDAY} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
        )}
        {today.length > 1 && (
          <path d={linePath(today, pick, scale)} fill="none" stroke={TODAY} strokeWidth="2" strokeLinecap="round" />
        )}
        {today.map((sample) => (
          <circle key={sample.t} cx={x(istMinutes(sample.t))} cy={y(pick(sample), scale)} r="6" fill="transparent">
            <title>{`${istClock(sample.t)} IST — ${format(pick(sample))} ${unit}`}</title>
          </circle>
        ))}
        {last && (
          <>
            <circle cx={x(istMinutes(last.t))} cy={y(pick(last), scale)} r="3" fill={TODAY} stroke="#0b1220" strokeWidth="2" />
            <text
              x={Math.min(x(istMinutes(last.t)) + 6, W - PAD.right - 2)}
              y={y(pick(last), scale) - 6}
              fontSize="10"
              fill="#e2e8f0"
              fontFamily="monospace"
            >
              {format(pick(last))}
            </text>
          </>
        )}
      </svg>
    </figure>
  );
}

export default async function LoadCurve() {
  const { today, yesterday, todayDate, yesterdayDate } = await getLoadCurves();

  if (today.length < 2 && yesterday.length < 2) {
    return (
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Load curve</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          The 15-minute grid sampler hasn&apos;t accumulated enough points yet — the day&apos;s
          curve appears here once a few hours of samples exist. No estimated or backfilled
          history is shown.
        </p>
      </section>
    );
  }

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">The day&apos;s shape</p>
        <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          MERIT · sampled every 15 min
        </span>
      </div>
      <PlainEnglish>
        How India&apos;s power use rises and falls over the day — low overnight, peaking in the evening —
        with today&apos;s line drawn against yesterday&apos;s for comparison.
      </PlainEnglish>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded" style={{ background: TODAY }} /> Today ({todayDate})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5 rounded"
            style={{ background: `repeating-linear-gradient(90deg, ${YESTERDAY} 0 5px, transparent 5px 9px)` }}
          />{" "}
          Yesterday ({yesterdayDate})
        </span>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <Chart
          title="Demand met"
          unit="MW"
          today={today}
          yesterday={yesterday}
          pick={(s) => s.demandMw}
          format={(v) => `${Math.round(v / 1000)}k`}
        />
        <Chart
          title="Renewables' share of generation"
          unit="%"
          today={today}
          yesterday={yesterday}
          pick={(s) => s.rePct}
          format={(v) => v.toFixed(0)}
        />
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-cyan-300 hover:text-white">
          View today&apos;s samples as a table
        </summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full min-w-[22rem] text-xs">
            <thead>
              <tr className="text-left font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-500">
                <th className="pb-1.5 pr-3 font-medium">IST</th>
                <th className="pb-1.5 pr-3 font-medium">Demand met (MW)</th>
                <th className="pb-1.5 font-medium">RE share (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-100/10 font-mono text-slate-300">
              {today.map((sample) => (
                <tr key={sample.t}>
                  <td className="py-1.5 pr-3">{istClock(sample.t)}</td>
                  <td className="py-1.5 pr-3">{sample.demandMw.toLocaleString("en-IN")}</td>
                  <td className="py-1.5">{sample.rePct.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Each point is an instantaneous MERIT reading sampled every 15 minutes; gaps mean the
        source was unreachable at that time. Not official CEA data.
      </p>
      <div className="mt-3">
        <ExplainButton section="load-curve" />
      </div>
    </section>
  );
}
