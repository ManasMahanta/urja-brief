// Section 2 — Why It Happened. The causal chain, news clustered by theme, and
// the week's event timeline that frames the move.

import type { NewsItem } from "@/lib/market";
import SectionShell from "@/components/intel/SectionShell";
import { Reveal } from "@/components/cinematic/Motion";
import { DemoBadge, LiveBadge, DirTag } from "@/components/intel/ui";
import CauseGraph from "@/components/intel/CauseGraph";
import { NEWS_CLUSTERS, EVENT_TIMELINE } from "@/lib/intel-data";

const impactColor = {
  high: "bg-rose-400/15 text-rose-200 border-rose-400/25",
  med: "bg-amber-400/15 text-amber-200 border-amber-400/25",
  low: "bg-white/5 text-text-dim border-white/15",
} as const;

export default function WhyItHappened({ news }: { news: NewsItem[] }) {
  return (
    <SectionShell
      id="why-it-happened"
      index="02"
      kicker="Section 02 · The mechanism"
      title="Why it happened"
      standfirst="Prices are effects. Here's the chain of causes — the macro trigger, the flows it set off, and the stocks at the end of the line."
      aside={<DemoBadge label="AI reasoning" />}
      answers={{
        happened: "A soft US inflation print reset global rate-cut expectations.",
        why: "Lower US yields weaken the dollar → EM risk appetite improves → FIIs buy Indian IT & financials.",
        care: "When a move is flow-driven, breadth and follow-through matter more than any single stock.",
        action: "Watch whether banks confirm the flow before chasing the leaders.",
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <CauseGraph />
        </Reveal>

        <div className="flex flex-col gap-6">
          {/* News clusters */}
          <Reveal delay={80}>
            <div className="glass p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">News clusters</h3>
                {news.length ? <LiveBadge /> : <DemoBadge />}
              </div>
              <p className="mt-1 text-xs text-text-mute">
                {news.length
                  ? `${news.length} live headlines, grouped by theme`
                  : "Grouped by theme"}
              </p>
              <ul className="mt-4 space-y-3">
                {NEWS_CLUSTERS.map((c) => (
                  <li key={c.theme} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{c.theme}</span>
                        <DirTag dir={c.sentiment}>{c.count}</DirTag>
                      </div>
                      <p className="mt-0.5 text-xs text-text-mute">{c.blurb}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Event timeline */}
          <Reveal delay={140}>
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white">Event timeline</h3>
              <ol className="mt-4 space-y-0">
                {EVENT_TIMELINE.map((e, i) => (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_1px_rgba(56,189,248,0.6)]" />
                      {i < EVENT_TIMELINE.length - 1 && (
                        <span className="w-px flex-1 bg-white/10" />
                      )}
                    </div>
                    <div className="pb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-wider text-text-mute">{e.date}</span>
                        <span className={`rounded border px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider ${impactColor[e.impact]}`}>
                          {e.impact}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-text-dim">
                        {e.label} <span className="text-text-mute">· {e.kind}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
