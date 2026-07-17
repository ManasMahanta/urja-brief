// Presentational primitives for the Intelligence OS. Deliberately server-safe
// (no hooks / "use client") so they can render inside Server Components; any
// motion comes from the CSS classes in globals.css or the <Reveal> wrapper.

import type { ReactNode } from "react";
import type { Direction } from "@/lib/intel-data";

/* --- Section framing ---------------------------------------------------- */

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="kicker">{children}</p>;
}

/** Marks any sample/representative (non-live) dataset. */
export function DemoBadge({ label = "Sample data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-amber-200/90">
      <span className="h-1 w-1 rounded-full bg-amber-300" />
      {label}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-emerald-200/90">
      <span className="live-dot h-1.5 w-1.5" />
      Live
    </span>
  );
}

/* --- Numbers ------------------------------------------------------------ */

export function Delta({
  pct,
  className = "",
  showArrow = true,
}: {
  pct: number;
  className?: string;
  showArrow?: boolean;
}) {
  const dir: Direction = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
  const color =
    dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-text-mute";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "▬";
  const sign = pct > 0 ? "+" : "";
  return (
    <span className={`tabular inline-flex items-center gap-1 font-mono ${color} ${className}`}>
      {showArrow && <span className="text-[0.7em]">{arrow}</span>}
      {sign}
      {pct.toFixed(2)}%
    </span>
  );
}

export function DirTag({ dir, children }: { dir: Direction; children: ReactNode }) {
  const map = {
    up: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    down: "border-rose-400/25 bg-rose-400/10 text-rose-200",
    flat: "border-white/15 bg-white/5 text-text-dim",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold uppercase tracking-wider ${map[dir]}`}>
      {children}
    </span>
  );
}

/* --- Sparkline (SVG) ---------------------------------------------------- */

export function Sparkline({
  data,
  width = 120,
  height = 34,
  dir,
  id,
}: {
  data: number[];
  width?: number;
  height?: number;
  dir?: Direction;
  id: string;
}) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="rounded bg-white/5" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const resolved: Direction = dir ?? (data[data.length - 1] >= data[0] ? "up" : "down");
  const stroke = resolved === "up" ? "#34d399" : resolved === "down" ? "#fb7185" : "#38bdf8";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`spk-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spk-${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={stroke} />
    </svg>
  );
}

/* --- Meters ------------------------------------------------------------- */

export function ConfidenceBar({ value, tone = "azure" }: { value: number; tone?: "azure" | "up" | "down" | "amber" | "violet" }) {
  const bg = {
    azure: "from-sky-500 to-cyan-400",
    up: "from-emerald-500 to-teal-400",
    down: "from-rose-500 to-orange-400",
    amber: "from-amber-500 to-yellow-400",
    violet: "from-violet-500 to-fuchsia-400",
  }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${bg}`}
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** A small numeric ring gauge (0..100). Pure SVG. */
export function ScoreRing({ value, size = 52, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const off = c - (pct / 100) * c;
  const color = pct >= 75 ? "#34d399" : pct >= 50 ? "#38bdf8" : "#fbbf24";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <span className="absolute tabular font-mono text-xs font-bold" style={{ color }}>
        {label ?? pct}
      </span>
    </div>
  );
}

/* --- Panels ------------------------------------------------------------- */

export function StatTile({
  label,
  value,
  sub,
  dir,
}: {
  label: string;
  value: string;
  sub?: string;
  dir?: Direction;
}) {
  const subColor =
    dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-text-mute";
  return (
    <div className="glass rail p-4" style={dir ? ({ ["--rail" as string]: dir === "up" ? "#34d399" : dir === "down" ? "#fb7185" : "#38bdf8" }) : undefined}>
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-text-mute">{label}</p>
      <p className="tabular mt-2 text-xl font-bold text-white">{value}</p>
      {sub && <p className={`mt-1 text-xs ${subColor}`}>{sub}</p>}
    </div>
  );
}
