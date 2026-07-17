// Section 03 — news sentiment.
//
// Renders REAL scored press coverage when available (every point traceable to a
// clickable article) and degrades to the AI's qualitative read when the feed or
// the scorer is down. Labelled "news", never "social" — see lib/sentiment.ts.

import type { SentimentRead, TrendPoint } from "@/lib/sentiment";
import type { Dissection } from "@/lib/stock-ai";
import Block from "@/components/stock/Block";
import { DemoBadge, ScoreRing } from "@/components/intel/ui";

const toneClass = (s: number) =>
  s > 15 ? "text-up" : s < -15 ? "text-down" : "text-sky-300";

const chipClass = (s: number) =>
  s > 15
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
    : s < -15
      ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
      : "border-white/10 bg-white/5 text-text-mute";

function ago(iso: string): string {
  const h = Math.floor((Date.now() - +new Date(iso)) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Sparkline of daily average tone. Flat line when there's only one day. */
function Trend({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;
  const w = 100;
  const h = 40;
  const y = (s: number) => h / 2 - (Math.max(-100, Math.min(100, s)) / 100) * (h / 2 - 3);
  const step = w / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const last = points[points.length - 1].score;

  return (
    <div className="mt-4">
      {/* Span is whatever the scored headlines actually cover — heavily-covered
          names cluster into 2-3 days — so the axis labels state the real dates
          rather than claiming a fixed window. */}
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">Tone · daily average</p>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1.5 h-10 w-full" aria-hidden="true">
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="currentColor" strokeWidth="0.4" className="text-white/15" strokeDasharray="2 2" />
        <path
          d={path}
          fill="none"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={last >= 0 ? "text-emerald-400" : "text-rose-400"}
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between font-mono text-[0.5rem] uppercase tracking-wider text-text-mute">
        <span>{points[0].date.slice(5)}</span>
        <span>{points[points.length - 1].date.slice(5)}</span>
      </div>
    </div>
  );
}

/** Fallback: the model's qualitative read, clearly badged as such. */
function AiRead({ d }: { d: Dissection }) {
  const s = d.sentiment;
  return (
    <Block id="sentiment" index="03" kicker="Narrative read" title="AI market sentiment" badge={<DemoBadge label="AI analysis" />}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="glass flex flex-col items-center justify-center p-6 text-center">
          <ScoreRing value={s.score} size={96} label={`${s.score}`} />
          <p className={`mt-3 text-lg font-bold ${s.overall === "Bullish" ? "text-up" : s.overall === "Bearish" ? "text-down" : "text-sky-300"}`}>
            {s.overall}
          </p>
          <p className="mt-1 text-xs text-text-mute">Composite sentiment</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["Institutional", s.institutional], ["Retail", s.retail], ["News flow", s.news], ["Read", s.note]] as const).map(([k, v]) => (
            <div key={k} className="glass p-4">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-text-mute">{k}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-text-dim">{v}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-text-mute">
        Live news feed unavailable right now — showing the AI&apos;s qualitative read
        instead. Not scraped platform data.
      </p>
    </Block>
  );
}

export default function SentimentSection({
  news,
  d,
  index = "03",
}: {
  news: SentimentRead | null;
  /** The stock page falls back to its AI narrative read; the fund page has no
   *  equivalent object and simply reports no coverage. */
  d?: Dissection;
  index?: string;
}) {
  if (!news) {
    if (d) return <AiRead d={d} />;
    return (
      <Block id="sentiment" index={index} kicker="News & sentiment" title="What the press is saying" badge={<DemoBadge label="No coverage" />}>
        <p className="text-sm text-text-mute">
          No press coverage found in the last 7 days. Smaller schemes are rarely
          covered by name — the data sections below are unaffected.
        </p>
      </Block>
    );
  }

  return (
    <Block
      id="sentiment"
      index={index}
      kicker="News & sentiment"
      title="What the press is saying"
      badge={<DemoBadge label={`${news.total} headlines · live`} />}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        {/* Composite */}
        <div className="glass flex flex-col justify-center p-6">
          <div className="flex flex-col items-center text-center">
            <ScoreRing value={news.score} size={96} label={`${news.score}`} />
            <p
              className={`mt-3 text-lg font-bold ${
                news.overall === "Bullish" ? "text-up" : news.overall === "Bearish" ? "text-down" : "text-sky-300"
              }`}
            >
              {news.overall}
            </p>
            <p className="mt-1 text-xs text-text-mute">
              {news.total} headlines · {news.outlets} outlets · 7d
            </p>
          </div>
          <Trend points={news.trend} />
        </div>

        {/* Scored coverage */}
        <div className="glass scroll-thin max-h-[26rem] overflow-y-auto p-2">
          <ul className="divide-y divide-white/5">
            {news.headlines.map((h) => (
              <li key={h.url} className="p-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`tabular mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold ${chipClass(h.score)}`}
                  >
                    {h.score > 0 ? "+" : ""}
                    {h.score}
                  </span>
                  <div className="min-w-0">
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm leading-snug text-text-dim transition hover:text-white"
                    >
                      {h.title}
                    </a>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[0.55rem] uppercase tracking-wider text-text-mute">
                      <span className="text-text-dim">{h.source}</span>
                      <span>·</span>
                      <span>{ago(h.date)}</span>
                      {h.why && (
                        <>
                          <span>·</span>
                          <span className={toneClass(h.score)}>{h.why}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs text-text-mute">
        Real press coverage from the last 7 days, scored by AI for tone — click any
        headline for the source. This is <span className="text-text-dim">news</span>{" "}
        sentiment, not social: X / Reddit / Telegram scoring needs a paid social
        provider. Educational only.
      </p>
    </Block>
  );
}
