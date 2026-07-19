import PlainEnglish from "@/components/urja/PlainEnglish";

// The day-by-day rollups are the only real time-series this site owns, so draw
// them instead of only tabling them: daily peak demand and daily peak renewable
// share, one bar per sampled day. Pure SVG from server data — no client JS.

type Row = { date: string; peakMw: number; maxRePct: number; samples: number };

const W = 720;
const H = 150;
const PAD = { top: 14, right: 8, bottom: 22, left: 40 };

function BarChart({
  rows,
  value,
  unit,
  color,
  format,
}: {
  rows: Row[];
  value: (r: Row) => number;
  unit: string;
  color: string;
  format: (v: number) => string;
}) {
  const vals = rows.map(value);
  const hi = Math.max(...vals);
  const lo = Math.min(...vals);
  const top = hi + (hi - lo) * 0.15 || hi * 1.1;
  const base = Math.max(0, lo - (hi - lo) * 0.4);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const bw = plotW / rows.length;
  const y = (v: number) => PAD.top + (1 - (v - base) / (top - base || 1)) * plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Daily ${unit} by day`}>
      {[top, base].map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
          <text x={PAD.left - 6} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="monospace">
            {format(tick)}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const v = value(r);
        const x = PAD.left + i * bw;
        const isMax = v === hi;
        return (
          <g key={r.date}>
            <rect
              x={x + bw * 0.15}
              y={y(v)}
              width={bw * 0.7}
              height={Math.max(1, PAD.top + plotH - y(v))}
              rx={2}
              fill={isMax ? color : `${color}99`}
            >
              <title>{`${r.date} — ${format(v)} ${unit}`}</title>
            </rect>
            {(i === 0 || i === rows.length - 1 || rows.length <= 10) && (
              <text x={x + bw / 2} y={H - 7} textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.6)" fontFamily="monospace">
                {r.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function RecordsTrend({ rows }: { rows: Row[] }) {
  const usable = rows.filter((r) => r.samples > 0);
  if (usable.length < 2) return null;
  // Oldest → newest so the chart reads left-to-right in time.
  const ordered = [...usable].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">The trend, day by day</p>
        <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          {ordered.length} sampled days
        </span>
      </div>
      <PlainEnglish>
        The same daily numbers as the table below, but drawn as a picture: how India&apos;s peak power use
        and its greenest moment have moved from day to day. The tallest bar is the record so far.
      </PlainEnglish>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Daily peak demand</p>
          <BarChart
            rows={ordered}
            value={(r) => r.peakMw}
            unit="GW peak"
            color="#22d3ee"
            format={(v) => `${(v / 1000).toFixed(0)}`}
          />
        </div>
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Daily peak renewable share</p>
          <BarChart
            rows={ordered}
            value={(r) => r.maxRePct}
            unit="% renewables"
            color="#34d399"
            format={(v) => `${v.toFixed(0)}%`}
          />
        </div>
      </div>
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Peak in gigawatts (1 GW = 1,000 MW); renewable share is the highest instantaneous reading each
        day. Bars reflect only what the 15-minute sampler caught — a true peak between two ticks can be
        missed.
      </p>
    </section>
  );
}
