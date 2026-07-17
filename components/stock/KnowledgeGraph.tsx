"use client";

// Interactive knowledge graph: the company at the centre, linked out to its
// executives, peers (clickable → their dissection), top institutional holders,
// and sector. Hovering a cluster lights its branch. Pure SVG, deterministic
// radial layout (no physics) so it renders identically on server and client.

import { useState } from "react";
import Link from "next/link";

type Leaf = { label: string; sub?: string; href?: string };
type Cluster = { key: string; label: string; angle: number; color: string; items: Leaf[] };

const CX = 50;
const CY = 42;
const rad = (d: number) => (d * Math.PI) / 180;
const trunc = (s: string, n = 16) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function polar(angleDeg: number, rx: number, ry: number): [number, number] {
  return [CX + Math.cos(rad(angleDeg)) * rx, CY + Math.sin(rad(angleDeg)) * ry];
}

export default function KnowledgeGraph({
  symbol,
  officers,
  peers,
  holders,
  sector,
  industry,
}: {
  symbol: string;
  officers: { name: string; title: string }[];
  peers: { symbol: string; name: string }[];
  holders: { name: string }[];
  sector?: string;
  industry?: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  const clusters: Cluster[] = [
    { key: "exec", label: "Executives", angle: -90, color: "#a78bfa", items: officers.slice(0, 4).map((o) => ({ label: o.name, sub: o.title })) },
    { key: "peers", label: "Peers", angle: 0, color: "#38bdf8", items: peers.slice(0, 4).map((p) => ({ label: p.symbol, sub: p.name, href: `/stock/${p.symbol}` })) },
    { key: "holders", label: "Holders", angle: 90, color: "#34d399", items: holders.slice(0, 4).map((h) => ({ label: h.name })) },
    { key: "sector", label: "Sector", angle: 180, color: "#fbbf24", items: [sector, industry].filter(Boolean).map((s) => ({ label: s as string })) },
  ].filter((c) => c.items.length);

  const dim = (key: string) => (active && active !== key ? 0.18 : 1);

  return (
    <div className="glass p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Entity graph</h3>
        <div className="flex flex-wrap gap-3">
          {clusters.map((c) => (
            <button
              key={c.key}
              onMouseEnter={() => setActive(c.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(c.key)}
              onBlur={() => setActive(null)}
              className="flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-wider text-text-mute transition hover:text-white"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 100 84" className="mt-2 w-full">
        {/* edges + leaves */}
        {clusters.map((c) => {
          const [hx, hy] = polar(c.angle, 20, 16);
          const n = c.items.length;
          const spread = n <= 1 ? 0 : Math.min(n * 22, 84);
          return (
            <g key={c.key} style={{ opacity: dim(c.key), transition: "opacity 0.3s" }}>
              {/* center → hub */}
              <line x1={CX} y1={CY} x2={hx} y2={hy} stroke={c.color} strokeWidth={0.5} strokeOpacity={0.5} />
              {c.items.map((leaf, i) => {
                const a = n === 1 ? c.angle : c.angle - spread / 2 + (i * spread) / (n - 1);
                const [lx, ly] = polar(a, 45, 34);
                const anchor = lx > 62 ? "start" : lx < 38 ? "end" : "middle";
                const node = (
                  <g key={i} className={leaf.href ? "cursor-pointer" : ""}>
                    <line x1={hx} y1={hy} x2={lx} y2={ly} stroke={c.color} strokeWidth={0.4} strokeOpacity={0.35} />
                    <circle cx={lx} cy={ly} r={1.6} fill={c.color} />
                    <text x={lx} y={ly - 2.4} textAnchor={anchor} fill="#c9d4e3" style={{ fontSize: 2.3 }}>
                      {trunc(leaf.label, 18)}
                    </text>
                  </g>
                );
                return leaf.href ? (
                  <Link key={i} href={leaf.href}>
                    {node}
                  </Link>
                ) : (
                  node
                );
              })}
              {/* hub */}
              <circle cx={hx} cy={hy} r={2.4} fill={c.color} />
              <text x={hx} y={hy + (c.angle === 90 ? 4.6 : -3.4)} textAnchor="middle" fill="#e7edf7" style={{ fontSize: 2.6, fontWeight: 700 }}>
                {c.label}
              </text>
            </g>
          );
        })}
        {/* center company node */}
        <circle cx={CX} cy={CY} r={5.5} fill="#0b1220" stroke="#38bdf8" strokeWidth={0.8} />
        <circle cx={CX} cy={CY} r={8.5} fill="none" stroke="#38bdf8" strokeWidth={0.4} strokeOpacity={0.3} />
        <text x={CX} y={CY + 1} textAnchor="middle" fill="#ffffff" style={{ fontSize: 3, fontWeight: 700 }}>
          {trunc(symbol.replace(/\.(NS|BO)$/, ""), 10)}
        </text>
      </svg>

      <p className="mt-1 text-[0.68rem] text-text-mute">
        Executives &amp; sector are live; peers are clickable → their dissection.
        Institutional holders shown where the exchange publishes them.
      </p>
    </div>
  );
}
