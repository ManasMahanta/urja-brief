// Homepage feature band for the AI Stock Dissection tool: inline symbol
// search + popular tickers, dropping the user straight into /stock/[symbol].

import Link from "next/link";
import { Reveal } from "@/components/cinematic/Motion";
import SymbolSearch from "@/components/stock/SymbolSearch";

const POPULAR: [string, string][] = [
  ["RELIANCE", "Reliance"],
  ["TCS", "TCS"],
  ["HDFCBANK", "HDFC Bank"],
  ["INFY", "Infosys"],
  ["TATAMOTORS", "Tata Motors"],
  ["NVDA", "NVIDIA"],
];

const FEATURES = [
  "Executive AI briefing",
  "Bull / base / bear thesis",
  "Risk matrix",
  "Catalyst timeline",
  "Scenario simulator",
  "AI copilot",
];

export default function DissectionPromo() {
  return (
    <section id="dissection" className="scroll-mt-24 py-16 sm:py-24">
      <Reveal>
        <div className="glass relative overflow-hidden p-6 sm:p-10">
          <div className="orb absolute -right-24 -top-28 h-72 w-72 bg-violet-500/16" />
          <div className="orb absolute -bottom-28 -left-20 h-72 w-72 bg-sky-500/12" style={{ animationDelay: "-14s" }} />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="flex items-center gap-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_2px_rgba(167,139,250,0.7)]" />
                New · AI Stock Dissection
              </p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Dissect any stock. <span className="display">360°, one page.</span>
              </h2>
              <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-text-dim">
                Type a ticker and get the full picture — live price structure, a
                hedge-fund-style AI briefing, risks, catalysts, an investment
                thesis, and a copilot you can interrogate. Never leave the page.
              </p>

              <div className="mt-6 max-w-xl">
                <SymbolSearch />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-mute">Try:</span>
                {POPULAR.map(([sym, name]) => (
                  <Link
                    key={sym}
                    href={`/stock/${sym}`}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-text-dim transition hover:border-violet-400/40 hover:text-white"
                  >
                    <span className="font-mono font-semibold">{sym}</span>
                    <span className="ml-1.5 text-text-mute">{name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {FEATURES.map((f, i) => (
                <div
                  key={f}
                  className="rail rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
                  style={{ ["--rail" as string]: i % 2 ? "#38bdf8" : "#a78bfa" }}
                >
                  <p className="text-xs font-medium text-text-dim">{f}</p>
                </div>
              ))}
              <Link
                href="/stock"
                className="col-span-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 p-3.5 text-center text-sm font-semibold text-white shadow-[0_0_30px_-8px_rgba(167,139,250,0.7)] transition hover:brightness-110"
              >
                Open Stock Dissection →
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
