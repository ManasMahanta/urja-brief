// The opening scene: a live capital-flow globe, the AI daily briefing, headline
// indices, the market pulse, and a full-bleed ticker ribbon. Server component —
// data arrives as props; only the globe / ticker / pulse are client leaves.

import Link from "next/link";
import type { Quote } from "@/lib/market";
import Globe from "@/components/intel/Globe";
import MarketPulse from "@/components/intel/MarketPulse";
import {
  LiveQuotesProvider,
  LiveIndexChips,
  LiveTicker,
  LiveStatus,
} from "@/components/intel/LiveMarket";

export default function Hero({
  indices,
  tickerQuotes,
  briefing,
  aiLive,
}: {
  indices: Quote[];
  tickerQuotes: Quote[];
  briefing: string;
  aiLive: boolean;
}) {
  const nifty = indices.find((q) => q.symbol.includes("NSEI")) ?? indices[0];
  const breadthPositive = (nifty?.changePercent ?? 0) >= 0;

  return (
    <LiveQuotesProvider initial={tickerQuotes}>
    <section className="relative overflow-hidden">
      {/* Globe layer — ambient centered backdrop on mobile, bold right-side
          object on tablet/desktop. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[42%] h-[150vw] w-[150vw] -translate-x-1/2 -translate-y-1/2 opacity-40 sm:left-auto sm:right-[-8%] sm:top-1/2 sm:h-[130vw] sm:max-h-[900px] sm:w-[130vw] sm:max-w-[900px] sm:translate-x-0 sm:opacity-90 lg:right-[2%]">
          <Globe />
        </div>
        {/* mobile: overall radial scrim so text is legible over the globe */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_44%,rgba(5,7,13,0.35),#05070d_78%)] sm:hidden" />
        {/* desktop: left-side legibility gradient */}
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#05070d_0%,#05070d_28%,rgba(5,7,13,0.6)_52%,transparent_75%)] sm:block" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05070d] to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[88svh] w-full max-w-6xl flex-col justify-center px-4 pb-14 pt-10 sm:min-h-[90svh] sm:px-6 sm:pt-14">
        <div className="max-w-2xl">
          <p className="kicker">
            Live · NSE / BSE · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
          </p>

          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="display">Your financial</span>
            <br />
            <span className="display">operating system.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-dim">
            Every force moving Indian markets — flows, earnings, policy, sentiment —
            observed, explained, and turned into intelligence. Not headlines.
            An answer.
          </p>

          {/* AI daily briefing */}
          <div className="glass rail mt-7 max-w-xl p-4 sm:mt-8 sm:p-5" style={{ ["--rail" as string]: "#a78bfa" }}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="flex items-center gap-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-violet-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_2px_rgba(167,139,250,0.7)]" />
                AI daily briefing
              </p>
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-text-mute">
                {aiLive ? "AI · generated" : "Editorial fallback"}
              </span>
            </div>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-text-dim">{briefing}</p>
          </div>

          {/* Headline indices — live, updating in place */}
          <div className="mt-6 flex items-center gap-3">
            <LiveStatus />
          </div>
          <div className="mt-2.5">
            <LiveIndexChips />
          </div>

          {/* Pulse + scroll cue */}
          <div className="mt-6 max-w-md">
            <MarketPulse
              positive={breadthPositive}
              intensity={Math.min(1, 0.35 + Math.abs(nifty?.changePercent ?? 0) / 2)}
              reading={breadthPositive ? "Risk-on · breadth firm" : "Risk-off · breadth soft"}
            />
          </div>

          <Link
            href="#what-happened"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-text-dim transition hover:text-white"
          >
            Begin the briefing
            <span className="inline-block translate-y-0 transition group-hover:translate-y-1">↓</span>
          </Link>
        </div>
      </div>

      <LiveTicker />
    </section>
    </LiveQuotesProvider>
  );
}
