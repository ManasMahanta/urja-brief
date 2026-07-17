// Shared live market-feed renderers used by both the homepage and /markets.
// Each is an async server component; wrap in <Suspense> at the call site.
// Every underlying fetcher returns [] on failure, so these degrade to a small
// "couldn't load" note rather than breaking the page.

import Link from "next/link";
import RadarCard, { StatPill } from "@/components/radar/RadarCard";
import {
  formatChange,
  formatPrice,
  formatShortDate,
  getHeadlineIndices,
  getMarketNews,
  getMovers,
  getSectorHeat,
  getTrendingTickers,
  type Mover,
  type Quote,
} from "@/lib/market";

export function EmptyFeed() {
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      Couldn&apos;t load live data right now — feeds refresh through the day, so
      check back soon.
    </p>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[0.04]"
        />
      ))}
    </div>
  );
}

function changeClass(pct: number): string {
  return pct >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
}

// --- Indices --------------------------------------------------------------

function IndexTile({ q }: { q: Quote }) {
  return (
    <div className="market-panel flex flex-col gap-1 rounded-xl p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {q.name}
      </p>
      <p className="text-xl font-bold tabular-nums">
        {q.price.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <p className={`text-sm font-medium tabular-nums ${changeClass(q.changePercent)}`}>
        {q.change >= 0 ? "+" : ""}
        {q.change.toFixed(2)} ({formatChange(q.changePercent)})
      </p>
    </div>
  );
}

export async function IndicesFeed({ limit = 4 }: { limit?: number }) {
  const indices = await getHeadlineIndices();
  if (indices.length === 0) return <EmptyFeed />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {indices.slice(0, limit).map((q) => (
        <IndexTile key={q.symbol} q={q} />
      ))}
    </div>
  );
}

// --- Movers ---------------------------------------------------------------

function MoverRow({ m }: { m: Mover }) {
  return (
    <li className="flex items-baseline justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{m.name}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.symbol}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="tabular-nums">{formatPrice(m.price)}</p>
        <p className={`text-sm font-medium tabular-nums ${changeClass(m.changePercent)}`}>
          {formatChange(m.changePercent)}
        </p>
      </div>
    </li>
  );
}

function MoverList({ title, movers }: { title: string; movers: Mover[] }) {
  return (
    <div className="market-panel rounded-2xl">
      <p className="border-b border-emerald-950/10 px-4 py-2.5 text-sm font-semibold dark:border-emerald-100/10">
        {title}
      </p>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {movers.map((m) => (
          <MoverRow key={m.symbol} m={m} />
        ))}
      </ul>
    </div>
  );
}

export async function MoversFeed({ limit = 6 }: { limit?: number }) {
  const { gainers, losers } = await getMovers(limit);
  if (gainers.length === 0 && losers.length === 0) return <EmptyFeed />;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MoverList title="Top gainers" movers={gainers} />
      <MoverList title="Top losers" movers={losers} />
    </div>
  );
}

// --- Sector heat ----------------------------------------------------------

export async function SectorHeatFeed() {
  const sectors = await getSectorHeat();
  if (sectors.length === 0) return <EmptyFeed />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {sectors.map((s) => {
        const up = s.changePercent >= 0;
        return (
          <div
            key={s.symbol}
            className={`rounded-xl border p-3 text-center ${
              up
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                : "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
            }`}
          >
            <p className="text-sm font-semibold">{s.name}</p>
            <p className={`text-sm font-medium tabular-nums ${changeClass(s.changePercent)}`}>
              {formatChange(s.changePercent)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// --- Trending -------------------------------------------------------------

export async function TrendingFeed({ limit = 8 }: { limit?: number }) {
  const trending = await getTrendingTickers(limit);
  if (trending.length === 0) return <EmptyFeed />;
  return (
    <div className="flex flex-wrap gap-2">
      {trending.map((t) => {
        const pct = t.changePercent;
        const up = (pct ?? 0) >= 0;
        return (
          <a
            key={t.symbol}
            href={`https://finance.yahoo.com/quote/${t.symbol}.NS`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm transition hover:border-sky-400/40 hover:bg-white/[0.06]"
          >
            <span className="font-mono font-semibold text-white">{t.symbol}</span>
            <span className="max-w-[9rem] truncate text-text-mute">{t.name}</span>
            {typeof pct === "number" && (
              <span className={`tabular font-mono text-xs font-semibold ${up ? "text-up" : "text-down"}`}>
                {up ? "▲" : "▼"} {up ? "+" : ""}
                {pct.toFixed(2)}%
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}

// --- News -----------------------------------------------------------------

export async function NewsFeed({ limit = 8 }: { limit?: number }) {
  const news = await getMarketNews(limit);
  if (news.length === 0) return <EmptyFeed />;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {news.map((n) => (
        <RadarCard
          key={n.url}
          href={n.url}
          title={n.title}
          eyebrow={n.source}
          stats={
            n.publishedAt ? (
              <StatPill>{formatShortDate(n.publishedAt)}</StatPill>
            ) : null
          }
        />
      ))}
    </div>
  );
}

// Small footer link back to the full markets page.
export function MoreLink({ anchor, label }: { anchor: string; label: string }) {
  return (
    <Link
      href={`/markets#${anchor}`}
      className="shrink-0 text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
    >
      {label} →
    </Link>
  );
}
