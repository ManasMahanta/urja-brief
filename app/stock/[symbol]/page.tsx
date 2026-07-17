import type { Metadata } from "next";
import Link from "next/link";
import { getDissection } from "@/lib/stock-ai";
import Disclaimer from "@/components/Disclaimer";
import SymbolSearch from "@/components/stock/SymbolSearch";
import SectionNav from "@/components/stock/SectionNav";
import StockHero from "@/components/stock/StockHero";
import Block from "@/components/stock/Block";
import { ExecBriefing, RiskMatrix, CatalystTimeline, ThesisPanel } from "@/components/stock/AiSections";
import SentimentSection from "@/components/stock/SentimentSection";
import { TechnicalPanel, SmartMoney, Competitive, FinancialHealth } from "@/components/stock/DataSections";
import { EarningsIntel, FinancialStatements, BusinessIntel } from "@/components/stock/Phase2Sections";
import { PersonaExplainer, ScenarioSim } from "@/components/stock/Interactive";
import KnowledgeGraph from "@/components/stock/KnowledgeGraph";
import PortfolioImpact from "@/components/stock/PortfolioImpact";
import ArthaCopilot from "@/components/stock/ArthaCopilot";

// Cache each symbol's dissection ~15 min. Kept moderate because a render where
// the GLM call failed ("AI offline") is cached too — retries in lib/glm.ts make
// that rare, and this bounds how long a rare failure can stick around.
export const revalidate = 900;
// The dissection GLM call can take ~20s; allow headroom for retries on Vercel.
export const maxDuration = 60;

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const clean = decodeURIComponent(symbol).replace(/\.(NS|BO)$/, "").toUpperCase();
  return {
    title: `${clean} — AI Stock Dissection`,
    description: `Full 360° AI dissection of ${clean}: live price, executive briefing, sentiment, risks, thesis, and an AI copilot. Educational only, not investment advice.`,
  };
}

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const { quote, data, technicals, fundamentals, indicators, peers, extras, news, aiLive } =
    await getDissection(decodeURIComponent(symbol));

  return (
    <div className="full-bleed -my-8 sm:-my-10">
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="pt-6">
          <p className="kicker mb-3">AI Stock Dissection</p>
          <SymbolSearch />
        </div>

        {!quote || !technicals ? (
          <div className="glass mt-10 p-8 text-center">
            <h1 className="text-xl font-bold text-white">Couldn&apos;t load that symbol</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-dim">
              Try an NSE/BSE ticker like <span className="font-mono text-sky-300">RELIANCE</span>,{" "}
              <span className="font-mono text-sky-300">TCS</span>, or a global one like{" "}
              <span className="font-mono text-sky-300">NVDA</span> — or search above.
            </p>
            <Link href="/markets" className="mt-5 inline-flex text-sm text-sky-300 hover:underline">
              Back to markets →
            </Link>
          </div>
        ) : (
          <>
            <SectionNav />

            <div className="pt-8">
              <StockHero quote={quote} data={data} technicals={technicals} fundamentals={fundamentals} aiLive={aiLive} />
            </div>

            <ExecBriefing d={data} live={aiLive} />
            <SentimentSection news={news} d={data} />
            <SmartMoney f={fundamentals} holders={extras.holders} />
            <FinancialHealth f={fundamentals} />
            <FinancialStatements extras={extras} />
            <EarningsIntel extras={extras} />
            <Competitive
              self={{
                symbol: quote.symbol,
                name: quote.name,
                row: {
                  symbol: quote.symbol,
                  name: quote.name,
                  sector: fundamentals?.sector,
                  marketCap: fundamentals?.marketCap,
                  trailingPE: fundamentals?.trailingPE,
                  roe: fundamentals?.roe,
                  operatingMargin: fundamentals?.operatingMargin,
                  revenueGrowth: fundamentals?.revenueGrowth,
                },
              }}
              peers={peers}
            />
            <TechnicalPanel quote={quote} t={technicals} ind={indicators} />
            <RiskMatrix d={data} live={aiLive} />
            <BusinessIntel d={data} live={aiLive} />
            <CatalystTimeline d={data} live={aiLive} />
            <ThesisPanel d={data} live={aiLive} />

            <Block id="graph" index="22" kicker="Knowledge graph" title="How it all connects">
              <KnowledgeGraph
                symbol={quote.symbol}
                officers={fundamentals?.officers ?? []}
                peers={peers.map((p) => ({ symbol: p.symbol, name: p.name }))}
                holders={extras.holders}
                sector={fundamentals?.sector}
                industry={fundamentals?.industry}
              />
            </Block>

            <Block id="portfolio" index="25" kicker="Portfolio impact" title="Does it fit your book?">
              <PortfolioImpact base={quote.symbol} baseName={quote.name} />
            </Block>

            <Block id="scenario" index="20" kicker="Scenario simulator" title="Stress the thesis" badge={undefined}>
              <ScenarioSim />
            </Block>

            <Block id="personas" index="24" kicker="Explain like…" title="Tailored explanations">
              <PersonaExplainer symbol={quote.symbol} name={quote.name} />
            </Block>

            <div className="mt-8">
              <Disclaimer />
            </div>

            {/* 23 · AI copilot — floats over the whole page */}
            <ArthaCopilot symbol={quote.symbol} name={quote.name} />
          </>
        )}
      </div>
    </div>
  );
}
