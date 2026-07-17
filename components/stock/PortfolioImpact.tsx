"use client";

// Portfolio-fit tool: the user enters their holdings and sees how the dissected
// stock correlates with them, its diversification benefit, and concentration —
// all from free daily-close history via /api/portfolio-impact.

import { useState } from "react";

type Row = { symbol: string; weight: number; corr: number | null };
type Result = {
  rows: Row[];
  portfolioCorr: number | null;
  diversification: number | null;
  hhi: number;
  topWeightPct: number;
  count: number;
};

const DEFAULT = [
  { symbol: "RELIANCE", weight: 30 },
  { symbol: "HDFCBANK", weight: 25 },
  { symbol: "INFY", weight: 20 },
  { symbol: "ITC", weight: 25 },
];

function corrTone(c: number | null): string {
  if (c == null) return "text-text-mute";
  if (c >= 0.6) return "text-down"; // high correlation = less diversifying
  if (c <= 0.3) return "text-up";
  return "text-amber-signal";
}

export default function PortfolioImpact({ base, baseName }: { base: string; baseName: string }) {
  const [holdings, setHoldings] = useState(DEFAULT);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const setRow = (i: number, key: "symbol" | "weight", v: string) =>
    setHoldings((hs) => hs.map((h, j) => (j === i ? { ...h, [key]: key === "weight" ? Number(v) || 0 : v.toUpperCase() } : h)));
  const addRow = () => setHoldings((hs) => [...hs, { symbol: "", weight: 10 }]);
  const removeRow = (i: number) => setHoldings((hs) => hs.filter((_, j) => j !== i));

  const analyze = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/portfolio-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base, holdings: holdings.filter((h) => h.symbol.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't analyze.");
      else setResult(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const cleanBase = base.replace(/\.(NS|BO)$/, "");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      {/* Holdings input */}
      <div className="glass p-5">
        <h3 className="text-sm font-semibold text-white">Your holdings</h3>
        <p className="mt-1 text-xs text-text-mute">Enter tickers + weights, then see how {cleanBase} fits.</p>
        <div className="mt-4 space-y-2">
          {holdings.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={h.symbol}
                onChange={(e) => setRow(i, "symbol", e.target.value)}
                placeholder="TICKER"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white placeholder:text-text-mute focus:border-sky-400/40"
              />
              <input
                type="number"
                value={h.weight}
                onChange={(e) => setRow(i, "weight", e.target.value)}
                className="w-16 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-center font-mono text-sm text-white focus:border-sky-400/40"
              />
              <span className="text-xs text-text-mute">%</span>
              <button onClick={() => removeRow(i)} className="text-text-mute transition hover:text-rose-300" aria-label="Remove">✕</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={addRow} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-text-dim transition hover:text-white">
            + Add holding
          </button>
          <button
            onClick={analyze}
            disabled={busy}
            className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-1.5 text-xs font-semibold text-[#04121b] transition enabled:hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Analyzing…" : "Analyze fit"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      </div>

      {/* Result */}
      <div className="glass p-5">
        {!result ? (
          <div className="flex h-full min-h-[12rem] items-center justify-center text-center text-sm text-text-mute">
            Enter your portfolio and hit &ldquo;Analyze fit&rdquo; to see {cleanBase}&apos;s correlation,
            diversification benefit, and concentration impact.
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <p className="text-[0.58rem] uppercase tracking-wider text-text-mute">Portfolio corr.</p>
                <p className={`tabular mt-1 font-mono text-lg font-bold ${corrTone(result.portfolioCorr)}`}>
                  {result.portfolioCorr != null ? result.portfolioCorr.toFixed(2) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <p className="text-[0.58rem] uppercase tracking-wider text-text-mute">Diversification</p>
                <p className="tabular mt-1 font-mono text-lg font-bold text-white">
                  {result.diversification != null ? `${Math.round(result.diversification * 100)}%` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <p className="text-[0.58rem] uppercase tracking-wider text-text-mute">Top weight</p>
                <p className="tabular mt-1 font-mono text-lg font-bold text-white">{Math.round(result.topWeightPct)}%</p>
              </div>
            </div>

            <p className="mt-4 font-mono text-[0.58rem] uppercase tracking-wider text-text-mute">
              {cleanBase} vs each holding (return correlation)
            </p>
            <ul className="mt-2 space-y-2">
              {result.rows.map((r) => (
                <li key={r.symbol} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 font-mono text-xs text-text-dim">{r.symbol}</span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="absolute inset-y-0 left-1/2 rounded-full"
                      style={{
                        width: `${Math.abs(r.corr ?? 0) * 50}%`,
                        transform: (r.corr ?? 0) < 0 ? "translateX(-100%)" : "none",
                        background: (r.corr ?? 0) >= 0.6 ? "#fb7185" : (r.corr ?? 0) <= 0.3 ? "#34d399" : "#fbbf24",
                      }}
                    />
                  </div>
                  <span className={`tabular w-10 shrink-0 text-right font-mono text-xs ${corrTone(r.corr)}`}>
                    {r.corr != null ? r.corr.toFixed(2) : "—"}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 rounded-lg bg-white/[0.03] p-3 text-xs leading-relaxed text-text-dim">
              {result.portfolioCorr == null
                ? "Not enough overlapping history to judge fit."
                : result.portfolioCorr >= 0.6
                  ? `${cleanBase} moves closely with your book — it adds exposure more than diversification.`
                  : result.portfolioCorr <= 0.3
                    ? `${cleanBase} is lowly correlated with your holdings — a genuine diversifier.`
                    : `${cleanBase} is moderately correlated — some diversification, some overlap.`}
              {result.hhi > 0.25 && " Your portfolio is fairly concentrated already."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
