import type { Metadata } from "next";
import { Suspense } from "react";
import RadarCard, { StatPill } from "@/components/radar/RadarCard";
import { EmptyFeed, SkeletonGrid } from "@/components/market/Feeds";
import Disclaimer from "@/components/Disclaimer";
import { getMarketNews, formatShortDate } from "@/lib/market";

export const metadata: Metadata = {
  title: "IPO Center",
  description:
    "Track Indian IPOs and new listings, learn what to check before you apply, and understand terms like DRHP, GMP, and ASBA. Educational only, not investment advice.",
};

const IPO_RE = /\b(ipo|listing|lists|listed|debut|drhp|subscri|grey market|gmp|allotment|anchor)\b/i;

async function IpoNews() {
  const news = await getMarketNews(40);
  const ipoNews = news.filter((n) => IPO_RE.test(n.title)).slice(0, 12);
  if (ipoNews.length === 0) return <EmptyFeed />;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ipoNews.map((n) => (
        <RadarCard
          key={n.url}
          href={n.url}
          title={n.title}
          eyebrow={n.source}
          stats={
            n.publishedAt ? <StatPill>{formatShortDate(n.publishedAt)}</StatPill> : null
          }
        />
      ))}
    </div>
  );
}

const CHECKLIST: [string, string][] = [
  ["Read the DRHP, not the hype", "The Draft Red Herring Prospectus is the primary source — business, financials, risks, and what the money is for. GMP and social-media buzz are not."],
  ["Why is the company raising money?", "Fresh issue funding growth is very different from an offer-for-sale where existing investors are cashing out. Check the split."],
  ["Look at the numbers, not the story", "Revenue and profit trend, debt, margins, and cash flow over the last 3 years. Is the growth real and profitable, or just a narrative?"],
  ["Sanity-check the valuation", "Compare the asking P/E to already-listed peers. A steep premium prices in a lot of future perfection."],
  ["Understand the mechanics", "Apply via ASBA (money is only blocked, not debited). Know the price band, lot size, and that oversubscription means you may not get an allotment."],
  ["Ignore the grey market premium", "GMP is an unofficial, unregulated, often-wrong sentiment number. It is not a reason to apply, and listing pops are not guaranteed."],
];

export default function IpoPage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="pt-6">
        <h1 className="text-4xl font-bold tracking-tight">IPO Center</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          New listings are exciting and easy to get wrong. Here&apos;s the live
          IPO news flow, plus a neutral checklist for thinking about an IPO
          before you apply.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">IPOs in the news</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Fresh IPO and listing coverage, pulled from India&apos;s markets
            press and refreshed through the day.
          </p>
        </div>
        <Suspense fallback={<SkeletonGrid />}>
          <IpoNews />
        </Suspense>
      </section>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Before you apply: a 6-point checklist
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            A framework for research — not a recommendation on any specific IPO.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {CHECKLIST.map(([title, body], i) => (
            <div
              key={title}
              className="rounded-xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/[0.035]"
            >
              <p className="font-mono text-xs font-semibold text-sky-500 dark:text-sky-400">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
