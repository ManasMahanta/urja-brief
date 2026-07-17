import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import RadarNav from "@/components/radar/RadarNav";
import {
  IndicesFeed,
  MoversFeed,
  NewsFeed,
  SectorHeatFeed,
  SkeletonGrid,
  TrendingFeed,
} from "@/components/market/Feeds";
import QuoteLookup from "@/components/market/QuoteLookup";
import StockDeepDive from "@/components/market/StockDeepDive";
import WeeklyQuiz from "@/components/radar/WeeklyQuiz";
import Disclaimer from "@/components/Disclaimer";
import { getWeeklyQuiz } from "@/lib/weekly-quiz";

export const metadata: Metadata = {
  title: "Markets",
  description:
    "A live pulse on the Indian market: Nifty and Sensex, top gainers and losers, sector heat, trending stocks, a quote lookup, and the day's headlines. Auto-refreshed through the day. Educational only.",
};

const sections = [
  { id: "quiz", label: "Weekly quiz" },
  { id: "indices", label: "Indices" },
  { id: "movers", label: "Gainers & losers" },
  { id: "sectors", label: "Sector heat" },
  { id: "lookup", label: "Quote lookup" },
  { id: "deep-dive", label: "Stock Deep-Dive" },
  { id: "trending", label: "Trending" },
  { id: "news", label: "Headlines" },
];

function MarketSection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-6 lg:scroll-mt-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      <Suspense fallback={<SkeletonGrid />}>{children}</Suspense>
    </section>
  );
}

// Self-hiding: renders nothing when GLM is unconfigured or the quiz is empty.
async function QuizSection() {
  const questions = await getWeeklyQuiz();
  if (questions.length === 0) return null;
  return (
    <section id="quiz" className="flex scroll-mt-24 flex-col gap-6 lg:scroll-mt-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">This week in the markets — quiz</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Six questions from this week&apos;s real market action. Did you keep up?
        </p>
      </div>
      <WeeklyQuiz questions={questions} />
    </section>
  );
}

export default function MarketsPage() {
  return (
    <div className="lg:relative lg:left-1/2 lg:w-[min(72rem,calc(100vw-4rem))] lg:-translate-x-1/2">
      <section className="pt-6">
        <h1 className="text-4xl font-bold tracking-tight">Markets</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          A live pulse on Dalal Street, between issues: where the indices stand,
          what&apos;s moving, where money is rotating, and the headlines behind
          it. Auto-refreshes through the day.
        </p>
      </section>

      <div className="mt-8 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start lg:gap-12">
        <aside className="sticky top-0 z-20 -mx-5 border-b border-zinc-200 bg-white/90 px-5 py-2.5 backdrop-blur dark:border-white/10 dark:bg-white/[0.035] lg:top-8 lg:z-auto lg:mx-0 lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <RadarNav sections={sections} />
        </aside>

        <div className="mt-8 flex flex-col gap-14 lg:mt-0">
          <Suspense fallback={null}>
            <QuizSection />
          </Suspense>

          <MarketSection
            id="indices"
            title="Where the market stands"
            subtitle="Nifty 50, Sensex, Bank Nifty, and Nifty IT — live."
          >
            <IndicesFeed />
          </MarketSection>

          <MarketSection
            id="movers"
            title="Gainers & losers"
            subtitle="The biggest moves across the large-cap universe today."
          >
            <MoversFeed limit={8} />
          </MarketSection>

          <MarketSection
            id="sectors"
            title="Sector heat"
            subtitle="How the sector indices performed, best to worst."
          >
            <SectorHeatFeed />
          </MarketSection>

          <section id="lookup" className="flex scroll-mt-24 flex-col gap-6 lg:scroll-mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Quote lookup</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Live price, day range, and 52-week range for any NSE stock.
                </p>
              </div>
              <Link
                href="/stock"
                className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 px-3.5 py-2 text-sm font-semibold text-[#04121b] transition hover:brightness-110"
              >
                Full AI dissection →
              </Link>
            </div>
            <QuoteLookup />
          </section>

          <section id="deep-dive" className="flex scroll-mt-24 flex-col gap-6 lg:scroll-mt-8">
            <StockDeepDive />
          </section>

          <MarketSection
            id="trending"
            title="Trending stocks"
            subtitle="The most actively traded large-caps right now, by volume."
          >
            <TrendingFeed />
          </MarketSection>

          <MarketSection
            id="news"
            title="Market headlines"
            subtitle="Fresh from ET Markets, Moneycontrol, Business Standard, and Mint."
          >
            <NewsFeed limit={12} />
          </MarketSection>

          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
