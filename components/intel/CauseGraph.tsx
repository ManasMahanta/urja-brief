"use client";

// Interactive cause-and-effect map: macro event → flows → sectors → stocks.
// Hovering (or focusing) a node lights its causal chain and surfaces the
// reasoning for each edge — the "why" made legible.

import { useState } from "react";
import { CAUSE_GRAPH, type GraphNode } from "@/lib/intel-data";

const KIND_COLOR: Record<GraphNode["kind"], string> = {
  event: "#fbbf24",
  macro: "#a78bfa",
  sector: "#38bdf8",
  stock: "#34d399",
};

export default function CauseGraph() {
  const { nodes, edges } = CAUSE_GRAPH;
  const [active, setActive] = useState<string | null>(null);
  const byId = (id: string) => nodes.find((n) => n.id === id)!;

  const isEdgeLit = (from: string, to: string) =>
    active === null || active === from || active === to;
  const isNodeLit = (id: string) =>
    active === null ||
    active === id ||
    edges.some((e) => (e.from === active && e.to === id) || (e.to === active && e.from === id));

  const activeEdges = active ? edges.filter((e) => e.from === active || e.to === active) : [];

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Cause → effect</h3>
        <div className="hidden gap-3 sm:flex">
          {(["event", "macro", "sector", "stock"] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-wider text-text-mute">
              <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 100 72" className="mt-3 w-full" style={{ height: "auto" }}>
        {/* edges */}
        {edges.map((e, i) => {
          const a = byId(e.from);
          const b = byId(e.to);
          const midX = (a.x + b.x) / 2;
          const lit = isEdgeLit(e.from, e.to);
          const color = e.effect === "positive" ? "#34d399" : "#fb7185";
          return (
            <path
              key={i}
              d={`M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`}
              fill="none"
              stroke={color}
              strokeWidth={lit ? 0.7 : 0.35}
              strokeOpacity={lit ? 0.85 : 0.15}
              className="transition-all duration-300"
            />
          );
        })}
        {/* nodes */}
        {nodes.map((n) => {
          const lit = isNodeLit(n.id);
          const color = KIND_COLOR[n.kind];
          return (
            <g
              key={n.id}
              tabIndex={0}
              role="button"
              aria-label={n.label}
              onMouseEnter={() => setActive(n.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(n.id)}
              onBlur={() => setActive(null)}
              className="cursor-pointer outline-none transition-opacity duration-300"
              style={{ opacity: lit ? 1 : 0.28 }}
            >
              <circle cx={n.x} cy={n.y} r={active === n.id ? 2.6 : 2} fill={color} className="transition-all duration-300" />
              <circle cx={n.x} cy={n.y} r={4.4} fill={color} opacity={active === n.id ? 0.22 : 0} className="transition-all duration-300" />
              <text
                x={n.x}
                y={n.y - 3.2}
                textAnchor="middle"
                fill="#e7edf7"
                style={{ fontSize: 2.5, fontWeight: 600 }}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* reasoning readout */}
      <div className="mt-2 min-h-[3.5rem] rounded-lg border border-white/10 bg-white/[0.03] p-3">
        {activeEdges.length ? (
          <ul className="space-y-1.5">
            {activeEdges.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-text-dim">
                <span
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: e.effect === "positive" ? "#34d399" : "#fb7185" }}
                />
                <span>
                  <strong className="text-white">{byId(e.from).label} → {byId(e.to).label}:</strong>{" "}
                  {e.note}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-mute">
            Hover a node to trace how today&apos;s macro event propagated into single stocks.
          </p>
        )}
      </div>
    </div>
  );
}
