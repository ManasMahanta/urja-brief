// Auto-compiled market snapshot: the single strongest signal from each feed,
// in one panel. Fetches the same data (and limits) as the homepage scenes, so
// Next dedupes the requests — the panel costs no extra API calls.

import {
  formatChange,
  getHeadlineIndices,
  getMarketNews,
  getMovers,
  getSectorHeat,
  getTrendingTickers,
} from "@/lib/market";

type Highlight = {
  tag: string;
  title: string;
  url?: string;
  stat: string;
  up?: boolean;
};

const YQ = (s: string) => `https://finance.yahoo.com/quote/${s}`;

export default async function Highlights() {
  const [indices, movers, sectors, news, trending] = await Promise.all([
    getHeadlineIndices(),
    getMovers(5),
    getSectorHeat(),
    getMarketNews(4),
    getTrendingTickers(4),
  ]);

  const nifty = indices.find((i) => i.name === "NIFTY 50") ?? indices[0];
  const topGainer = movers.gainers[0];
  const topLoser = movers.losers[0];
  const topSector = sectors[0];
  const topNews = news[0];
  const topTrend = trending[0];

  const items = [
    nifty && {
      tag: "Nifty 50",
      title: nifty.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      url: YQ("%5ENSEI"),
      stat: formatChange(nifty.changePercent),
      up: nifty.changePercent >= 0,
    },
    topGainer && {
      tag: "Top gainer",
      title: topGainer.name,
      url: YQ(`${topGainer.symbol}.NS`),
      stat: formatChange(topGainer.changePercent),
      up: true,
    },
    topLoser && {
      tag: "Top loser",
      title: topLoser.name,
      url: YQ(`${topLoser.symbol}.NS`),
      stat: formatChange(topLoser.changePercent),
      up: false,
    },
    topSector && {
      tag: "Best sector",
      title: `${topSector.name} index`,
      stat: formatChange(topSector.changePercent),
      up: topSector.changePercent >= 0,
    },
    topTrend && {
      tag: "Trending",
      title: topTrend.name,
      url: YQ(`${topTrend.symbol}.NS`),
      stat: topTrend.symbol,
    },
    topNews && {
      tag: "Headline",
      title: topNews.title,
      url: topNews.url,
      stat: topNews.source,
    },
  ].filter(Boolean) as Highlight[];

  if (items.length === 0) return null;

  return (
    <ol className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white/65 dark:divide-zinc-800 dark:border-white/10 dark:bg-white/[0.035]">
      {items.map((h) => (
        <li key={h.tag} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-4">
          <span className="w-28 shrink-0 font-mono text-xs font-semibold uppercase tracking-wide text-sky-500 dark:text-sky-400">
            {h.tag}
          </span>
          {h.url ? (
            <a
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 font-medium leading-snug hover:text-sky-600 dark:hover:text-sky-400"
            >
              {h.title}
            </a>
          ) : (
            <span className="min-w-0 flex-1 font-medium leading-snug">{h.title}</span>
          )}
          <span
            className={`shrink-0 text-xs tabular-nums ${
              h.up === undefined
                ? "text-zinc-500 dark:text-zinc-400"
                : h.up
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {h.stat}
          </span>
        </li>
      ))}
    </ol>
  );
}
