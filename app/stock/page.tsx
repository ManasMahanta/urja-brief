import type { Metadata } from "next";
import Link from "next/link";
import SymbolSearch from "@/components/stock/SymbolSearch";
import { Kicker } from "@/components/intel/ui";

export const metadata: Metadata = {
  title: "AI Stock Dissection — research any company",
  description:
    "A 360° AI dissection of any stock: live price, executive briefing, sentiment, risks, thesis, scenario simulator, and an AI copilot. Educational only.",
};

const POPULAR = [
  ["RELIANCE", "Reliance"],
  ["TCS", "TCS"],
  ["HDFCBANK", "HDFC Bank"],
  ["INFY", "Infosys"],
  ["ICICIBANK", "ICICI Bank"],
  ["TATAMOTORS", "Tata Motors"],
  ["SBIN", "SBI"],
  ["BHARTIARTL", "Airtel"],
  ["NVDA", "NVIDIA"],
  ["AAPL", "Apple"],
  ["MSFT", "Microsoft"],
  ["TSLA", "Tesla"],
];

export default function StockLanding() {
  return (
    <div className="mx-auto max-w-3xl py-6">
      <Kicker>AI Stock Dissection</Kicker>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        <span className="display">Never leave the page</span>
        <br />
        <span className="display">to research a stock.</span>
      </h1>
      <p className="mt-4 max-w-xl text-text-dim">
        Search any company for a full 360° AI dissection — live price, an
        executive briefing, sentiment, risks, an investment thesis, a scenario
        simulator, and an AI copilot you can interrogate.
      </p>

      <div className="mt-7">
        <SymbolSearch autoFocus />
      </div>

      <p className="mt-8 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-text-mute">
        Popular
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {POPULAR.map(([sym, name]) => (
          <Link
            key={sym}
            href={`/stock/${sym}`}
            className="glass glass-hover inline-flex items-center gap-2 px-3.5 py-2 text-sm"
          >
            <span className="font-mono font-semibold text-white">{sym}</span>
            <span className="text-text-mute">{name}</span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-text-mute">
        Educational only, not investment advice. Live price/technical data is
        real; company fundamentals need a data provider and are shown as
        placeholders rather than fabricated.
      </p>
    </div>
  );
}
