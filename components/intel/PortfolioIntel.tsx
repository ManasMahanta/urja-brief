"use client";

// Section 5 — Portfolio Intelligence. A demo dashboard: allocation, a risk
// radar, an interactive scenario simulator, and AI recommendations. All figures
// are illustrative (SAMPLE) — not advice, not a real portfolio.

import { useState } from "react";
import {
  DEMO_PORTFOLIO,
  RISK_RADAR,
  SCENARIOS,
  PORTFOLIO_RECS,
} from "@/lib/intel-data";
import { DemoBadge, Delta } from "@/components/intel/ui";

const BASE_VALUE = 2_480_000; // ₹24.8L illustrative book

const SECTOR_COLORS: Record<string, string> = {
  Energy: "#38bdf8",
  Bank: "#34d399",
  IT: "#a78bfa",
  Auto: "#fbbf24",
  Pharma: "#22d3ee",
  Metal: "#fb7185",
};

function RiskRadar() {
  const cx = 110;
  const cy = 110;
  const R = 84;
  const n = RISK_RADAR.length;
  const angle = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (i: number, r: number) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  const poly = RISK_RADAR.map((a, i) => pt(i, (a.value / 100) * R).map((v) => v.toFixed(1)).join(",")).join(" ");

  return (
    <svg viewBox="0 0 220 220" className="mx-auto w-full max-w-[240px]">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={RISK_RADAR.map((_, i) => pt(i, f * R).map((v) => v.toFixed(1)).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}
      {RISK_RADAR.map((a, i) => {
        const [x, y] = pt(i, R);
        const [lx, ly] = pt(i, R + 16);
        return (
          <g key={a.axis}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#8b98ab" style={{ fontSize: 8 }}>
              {a.axis}
            </text>
          </g>
        );
      })}
      <polygon points={poly} fill="rgba(56,189,248,0.16)" stroke="#38bdf8" strokeWidth="1.6" />
      {RISK_RADAR.map((a, i) => {
        const [x, y] = pt(i, (a.value / 100) * R);
        return <circle key={i} cx={x} cy={y} r="2.4" fill="#38bdf8" />;
      })}
    </svg>
  );
}

export default function PortfolioIntel() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const projected = BASE_VALUE * (1 + scenario.portfolioPct / 100);
  const deltaValue = projected - BASE_VALUE;

  // Aggregate weights by sector for the allocation donut.
  const bySector = DEMO_PORTFOLIO.reduce<Record<string, number>>((acc, h) => {
    acc[h.sector] = (acc[h.sector] || 0) + h.weight;
    return acc;
  }, {});
  let acc = 0;
  const stops = Object.entries(bySector).map(([sector, w]) => {
    const start = acc;
    acc += w;
    return `${SECTOR_COLORS[sector] || "#64748b"} ${start}% ${acc}%`;
  });
  const donut = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Allocation */}
      <div className="glass p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Allocation</h3>
          <DemoBadge />
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: donut }}>
            <div className="absolute inset-[14px] rounded-full bg-[#080d18]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="tabular font-mono text-sm font-bold text-white">₹24.8L</span>
              <span className="text-[0.55rem] uppercase tracking-wider text-text-mute">book</span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {Object.entries(bySector).sort((a, b) => b[1] - a[1]).map(([sector, w]) => (
              <li key={sector} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: SECTOR_COLORS[sector] || "#64748b" }} />
                <span className="flex-1 truncate text-text-dim">{sector}</span>
                <span className="tabular font-mono text-text-mute">{w}%</span>
              </li>
            ))}
          </ul>
        </div>
        <ul className="mt-4 divide-y divide-white/8">
          {DEMO_PORTFOLIO.slice(0, 4).map((h) => (
            <li key={h.symbol} className="flex items-center justify-between py-2">
              <span className="font-mono text-xs text-white">{h.symbol}</span>
              <Delta pct={h.pnlPct} className="text-xs" />
            </li>
          ))}
        </ul>
      </div>

      {/* Risk radar */}
      <div className="glass p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Risk radar</h3>
          <DemoBadge />
        </div>
        <RiskRadar />
        <p className="mt-2 text-center text-xs text-text-mute">
          Concentration is the dominant exposure — two IT names carry the book.
        </p>
      </div>

      {/* Scenario simulator + recs */}
      <div className="flex flex-col gap-6">
        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Scenario simulator</h3>
            <DemoBadge />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenarioId(s.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  scenarioId === s.id
                    ? "border-sky-400/40 bg-sky-400/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-text-mute hover:text-text-dim"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[0.62rem] uppercase tracking-wider text-text-mute">Projected book</p>
            <p className="tabular mt-1 font-mono text-2xl font-bold text-white">
              ₹{(projected / 100000).toFixed(2)}L
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <Delta pct={scenario.portfolioPct} />
              <span className="text-text-mute">
                ({deltaValue >= 0 ? "+" : "−"}₹{Math.abs(deltaValue / 1000).toFixed(0)}k) · {scenario.note}
              </span>
            </p>
          </div>
        </div>

        <div className="glass rail p-5" style={{ ["--rail" as string]: "#a78bfa" }}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-violet-400" /> AI recommendations
          </h3>
          <ul className="mt-3 space-y-2.5">
            {PORTFOLIO_RECS.map((r) => (
              <li key={r.action} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{r.action}</span>
                  <span className="font-mono text-[0.58rem] uppercase tracking-wider text-text-mute">{r.symbol}</span>
                </div>
                <p className="mt-1 text-xs text-text-dim">{r.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
