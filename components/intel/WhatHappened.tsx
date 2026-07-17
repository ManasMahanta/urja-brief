// Section 1 — What Happened. Live sector heat + movers, an AI recap of the
// rising/falling story, and the day's breadth/flow stat line.

import type { Quote, Mover } from "@/lib/market";
import { formatChange } from "@/lib/market";
import SectionShell from "@/components/intel/SectionShell";
import { Reveal } from "@/components/cinematic/Motion";
import { DemoBadge, LiveBadge, StatTile, Delta } from "@/components/intel/ui";
import { MARKET_RECAP, SECTOR_NOTES, dirOf } from "@/lib/intel-data";

function heatTone(pct: number) {
  if (pct >= 1.5) return "border-emerald-400/50 bg-emerald-400/[0.14]";
  if (pct >= 0.3) return "border-emerald-400/30 bg-emerald-400/[0.07]";
  if (pct <= -1.5) return "border-rose-400/50 bg-rose-400/[0.14]";
  if (pct <= -0.3) return "border-rose-400/30 bg-rose-400/[0.07]";
  return "border-white/10 bg-white/[0.03]";
}

export default function WhatHappened({
  sectors,
  gainers,
  losers,
}: {
  sectors: Quote[];
  gainers: Mover[];
  losers: Mover[];
}) {
  // Merge live sector % (by name) with the editorial "driver" notes.
  const heat = SECTOR_NOTES.map((note) => {
    const live = sectors.find((s) => s.name.toLowerCase().includes(note.sector.toLowerCase()));
    return {
      ...note,
      changePct: live ? live.changePercent : note.changePct,
      isLive: Boolean(live),
    };
  }).sort((a, b) => b.changePct - a.changePct);

  const topRise = heat[0];
  const topFall = heat[heat.length - 1];
  const anyLive = heat.some((h) => h.isLive);

  return (
    <SectionShell
      id="what-happened"
      index="01"
      kicker="Section 01 · The tape"
      title="What happened today"
      standfirst="The whole session, compressed: which sectors led, which lagged, and the breadth beneath the index number."
      aside={anyLive ? <LiveBadge /> : <DemoBadge />}
      answers={{
        happened: `${topRise.sector} led (${formatChange(topRise.changePct)}); ${topFall.sector} lagged (${formatChange(topFall.changePct)}).`,
        why: `${topRise.driver}.`,
        care: "Sector leadership tells you where flows are rotating before the index does.",
        action: "Note the leaders — Section 6 turns rotation into a watchlist.",
      }}
    >
      {/* Breadth / flow stat line */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {MARKET_RECAP.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} sub={s.sub} dir={s.dir} />
        ))}
      </div>
      <p className="mt-2 flex items-center gap-2 text-xs text-text-mute">
        <DemoBadge label="Sample flows" /> Breadth & FII/DII figures are illustrative.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Floating sector heatmap */}
        <Reveal>
          <div className="glass p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Sector heatmap</h3>
              {anyLive ? <LiveBadge /> : <DemoBadge />}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {heat.map((h) => (
                <div
                  key={h.sector}
                  className={`group relative rounded-xl border p-3 transition ${heatTone(h.changePct)}`}
                  title={h.driver}
                >
                  <p className="text-xs font-semibold text-white">{h.sector}</p>
                  <Delta pct={h.changePct} className="mt-1 text-sm" />
                  <p className="mt-2 line-clamp-2 text-[0.68rem] leading-snug text-text-mute">
                    {h.driver}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* AI recap cards */}
        <div className="flex flex-col gap-4">
          <Reveal delay={80}>
            <div className="glass rail p-5" style={{ ["--rail" as string]: "#34d399" }}>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-emerald-300">Leaders</p>
              <ul className="mt-3 space-y-2.5">
                {gainers.slice(0, 4).map((m) => (
                  <li key={m.symbol} className="flex items-center justify-between text-sm">
                    <span className="truncate text-text-dim">{m.name}</span>
                    <Delta pct={m.changePercent} className="text-xs" />
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="glass rail p-5" style={{ ["--rail" as string]: "#fb7185" }}>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-rose-300">Laggards</p>
              <ul className="mt-3 space-y-2.5">
                {losers.slice(0, 4).map((m) => (
                  <li key={m.symbol} className="flex items-center justify-between text-sm">
                    <span className="truncate text-text-dim">{m.name}</span>
                    <Delta pct={m.changePercent} className="text-xs" />
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
