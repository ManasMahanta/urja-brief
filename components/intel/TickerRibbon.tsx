"use client";

// Seamless dual-track marquee of live index/macro quotes. Pauses on hover.

import type { Quote } from "@/lib/market";

function Cell({ q }: { q: Quote }) {
  const up = q.changePercent >= 0;
  return (
    <span className="mx-5 inline-flex items-baseline gap-2 whitespace-nowrap">
      <span className="font-mono text-xs font-semibold tracking-wide text-text-dim">
        {q.name}
      </span>
      <span className="tabular font-mono text-xs font-semibold text-white">
        {q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </span>
      <span className={`tabular font-mono text-xs font-semibold ${up ? "text-up" : "text-down"}`}>
        {up ? "▲" : "▼"} {up ? "+" : ""}
        {q.changePercent.toFixed(2)}%
      </span>
    </span>
  );
}

export default function TickerRibbon({ quotes }: { quotes: Quote[] }) {
  if (!quotes.length) return null;
  const track = [...quotes, ...quotes];
  return (
    <div className="marquee border-y border-white/10 bg-[#070c16]/80 py-2.5 backdrop-blur">
      <div className="marquee__track">
        {track.map((q, i) => (
          <Cell key={`${q.symbol}-${i}`} q={q} />
        ))}
      </div>
    </div>
  );
}
