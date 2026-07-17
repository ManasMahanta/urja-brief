// Section 3 — What Matters Today. Ranked priority intelligence, the earnings
// calendar, and institutional / insider signal tables.

import SectionShell from "@/components/intel/SectionShell";
import { Reveal } from "@/components/cinematic/Motion";
import { DemoBadge, ConfidenceBar, ScoreRing, DirTag } from "@/components/intel/ui";
import {
  PRIORITY_CARDS,
  EARNINGS_CAL,
  INSTITUTIONAL_SIGNALS,
  INSIDER_ALERTS,
  type SignalRow,
} from "@/lib/intel-data";

const tagColor: Record<string, string> = {
  Earnings: "text-sky-300 border-sky-400/25 bg-sky-400/10",
  Policy: "text-violet-300 border-violet-400/25 bg-violet-400/10",
  Insider: "text-amber-300 border-amber-400/25 bg-amber-400/10",
  Institutional: "text-emerald-300 border-emerald-400/25 bg-emerald-400/10",
  Technical: "text-cyan-300 border-cyan-400/25 bg-cyan-400/10",
};

function SignalTable({ title, rows }: { title: string; rows: SignalRow[] }) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <DemoBadge />
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.symbol} className="flex items-center gap-3">
            <ScoreRing value={r.strength} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-white">{r.symbol}</span>
                <DirTag dir={r.dir}>{r.signal}</DirTag>
              </div>
              <p className="mt-0.5 truncate text-xs text-text-mute">{r.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WhatMatters() {
  return (
    <SectionShell
      id="what-matters"
      index="03"
      kicker="Section 03 · The docket"
      title="What matters today"
      standfirst="Everything filtered to what can actually move your screen in the next 24 hours — ranked, scored, and time-stamped."
      aside={<DemoBadge label="Prioritised" />}
      answers={{
        happened: "Four catalysts cleared the relevance bar for today.",
        why: "Each is either a scheduled event or a fresh flow/insider signal with asymmetric impact.",
        care: "Most 'news' is noise. This is the short list that changes positioning.",
        action: "Work top-down: handle rank 1 before the market opens.",
      }}
    >
      {/* Priority cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {PRIORITY_CARDS.map((c, i) => (
          <Reveal key={c.rank} delay={i * 60}>
            <article className="glass glass-hover rail h-full p-5" style={{ ["--rail" as string]: c.rank === 1 ? "#fbbf24" : "#38bdf8" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold ${c.rank === 1 ? "bg-amber-400/20 text-amber-200 ring-pulse" : "bg-white/8 text-text-dim"}`}>
                    {c.rank}
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 font-mono text-[0.58rem] font-semibold uppercase tracking-wider ${tagColor[c.tag]}`}>
                    {c.tag}
                  </span>
                </div>
                <span className="tabular font-mono text-[0.62rem] text-text-mute">{c.confidence}% conf.</span>
              </div>
              <h4 className="mt-3 font-semibold text-white">{c.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-text-dim">{c.why}</p>
              <div className="mt-3">
                <ConfidenceBar value={c.confidence} tone={c.rank === 1 ? "amber" : "azure"} />
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-400/[0.06] p-2.5 text-xs text-emerald-200/90">
                <span className="mt-0.5">→</span>
                <span>{c.action}</span>
              </p>
            </article>
          </Reveal>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Earnings calendar */}
        <Reveal>
          <div className="glass p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Earnings calendar</h3>
              <DemoBadge />
            </div>
            <ul className="mt-4 divide-y divide-white/8">
              {EARNINGS_CAL.map((e) => (
                <li key={e.symbol} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-mono text-xs font-semibold text-white">{e.symbol}</p>
                    <p className="text-[0.68rem] text-text-mute">{e.when}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-mono text-xs text-text-dim">est. {e.estEps}</p>
                    <DirTag dir={e.whisper}>{e.whisper === "up" ? "beat whisper" : e.whisper === "down" ? "miss risk" : "in-line"}</DirTag>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <SignalTable title="Institutional buying" rows={INSTITUTIONAL_SIGNALS} />
        </Reveal>
        <Reveal delay={140}>
          <SignalTable title="Insider & promoter" rows={INSIDER_ALERTS} />
        </Reveal>
      </div>
    </SectionShell>
  );
}
