// Section 6 — Market Opportunities. AI-generated watchlists (hidden gems,
// momentum, value) and a sector-rotation flow map. Illustrative screens, not
// recommendations.

import type { Opportunity } from "@/lib/intel-data";
import { HIDDEN_GEMS, MOMENTUM, VALUE, SECTOR_ROTATION } from "@/lib/intel-data";
import { Reveal } from "@/components/cinematic/Motion";
import { DemoBadge, ScoreRing } from "@/components/intel/ui";

function OppList({
  title,
  accent,
  items,
}: {
  title: string;
  accent: string;
  items: Opportunity[];
}) {
  return (
    <div className="glass glass-hover rail h-full p-5" style={{ ["--rail" as string]: accent }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <DemoBadge />
      </div>
      <ul className="mt-4 space-y-4">
        {items.map((o) => (
          <li key={o.symbol} className="flex gap-3">
            <ScoreRing value={o.score} size={48} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-white">{o.symbol}</span>
                <span className="truncate text-xs text-text-mute">{o.name}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {o.tags.map((t) => (
                  <span key={t} className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[0.58rem] text-text-dim">
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-xs leading-snug text-text-dim">{o.thesis}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Opportunities() {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Reveal>
          <OppList title="Hidden gems" accent="#22d3ee" items={HIDDEN_GEMS} />
        </Reveal>
        <Reveal delay={80}>
          <OppList title="Momentum" accent="#fbbf24" items={MOMENTUM} />
        </Reveal>
        <Reveal delay={140}>
          <OppList title="Value" accent="#34d399" items={VALUE} />
        </Reveal>
      </div>

      {/* Sector rotation */}
      <Reveal delay={80}>
        <div className="glass mt-6 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Sector rotation</h3>
            <DemoBadge />
          </div>
          <p className="mt-1 text-xs text-text-mute">Where capital is rotating out of — and into.</p>
          <ul className="mt-4 space-y-3">
            {SECTOR_ROTATION.map((r) => (
              <li key={`${r.from}-${r.to}`} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-right text-sm text-rose-200/80">{r.from}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="sweep absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-400/50 to-emerald-400/70"
                    style={{ width: `${r.strength}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-sm text-emerald-200/90">{r.to}</span>
                <span className="tabular w-10 shrink-0 text-right font-mono text-xs text-text-mute">{r.strength}%</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* Closing CTA */}
      <Reveal delay={120}>
        <div className="glass relative mt-10 overflow-hidden p-7 text-center sm:p-10">
          <div className="orb absolute -right-20 -top-24 h-64 w-64 bg-sky-500/15" />
          <div className="orb absolute -bottom-24 -left-16 h-64 w-64 bg-violet-500/12" style={{ animationDelay: "-12s" }} />
          <p className="kicker justify-center">Close the loop</p>
          <h3 className="mx-auto mt-4 max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
            The market runs all day. Your intelligence should too.
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text-dim">
            Get the AI briefing, the live desk, and the weekend deep-dive — free.
            Educational market intelligence, never a buy or sell call.
          </p>
          <a
            href="/subscribe"
            className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-[#04121b] shadow-[0_0_36px_-6px_rgba(56,189,248,0.7)] transition hover:brightness-110"
          >
            Get access →
          </a>
        </div>
      </Reveal>
    </>
  );
}
