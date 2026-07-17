// Presentational intraday area chart with a self-drawing line. Server-safe.

export default function StockChart({
  data,
  up,
  height = 120,
}: {
  data: number[];
  up: boolean;
  height?: number;
}) {
  const W = 600;
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-xs text-text-mute"
        style={{ height }}
      >
        No intraday data
      </div>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = W / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, height - 6 - ((v - min) / span) * (height - 14)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${height} L0 ${height} Z`;
  const stroke = up ? "#34d399" : "#fb7185";
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id="sc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.26" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sc-fill)" />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="chart-line"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill={stroke} />
    </svg>
  );
}
