// Live index/macro ticker strip. Server component: fetches quotes, renders a
// CSS marquee. Shows nothing if every feed is down (page never breaks).

import { getTickerQuotes, formatChange } from "@/lib/market";

export default async function MarketTicker() {
  const quotes = await getTickerQuotes();
  if (quotes.length === 0) return null;

  // Duplicate the list so the marquee loops seamlessly.
  const items = [...quotes, ...quotes];

  return (
    <div className="marquee market-panel border-y bg-white/70 dark:bg-white/[0.035]">
      <div className="marquee__track py-2">
        <span className="mx-4 inline-flex items-center gap-2 font-mono text-[0.68rem] font-bold tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> LIVE TAPE
        </span>
        {items.map((q, i) => {
          const up = q.changePercent >= 0;
          return (
            <span
              key={`${q.symbol}-${i}`}
              className="mx-4 inline-flex items-baseline gap-1.5 text-sm"
            >
              <span className="font-semibold">{q.name}</span>
              <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
                {q.price.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={
                  up
                    ? "tabular-nums text-emerald-600 dark:text-emerald-400"
                    : "tabular-nums text-rose-600 dark:text-rose-400"
                }
              >
                {formatChange(q.changePercent)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
