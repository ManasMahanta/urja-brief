import type { Metadata } from "next";
import Link from "next/link";
import { getFund, getNav } from "@/lib/mf";
import { getFundThesis } from "@/lib/mf-ai";
import { getNewsSentiment } from "@/lib/sentiment";
import Disclaimer from "@/components/Disclaimer";
import Block from "@/components/stock/Block";
import SentimentSection from "@/components/stock/SentimentSection";
import ArthaCopilot from "@/components/stock/ArthaCopilot";
import FundSearch from "@/components/fund/FundSearch";
import FundNav from "@/components/fund/FundNav";
import FundHero from "@/components/fund/FundHero";
import SipSim from "@/components/fund/SipSim";
import { Returns, Risk, Rolling, Benchmark, Cost, Peers, AiBriefing, Thesis, Gaps } from "@/components/fund/FundSections";

// NAV only changes once a day, but the AI/news layers benefit from a shorter
// window than the 12h data cache underneath.
export const revalidate = 3600;
export const maxDuration = 60;

/** Fund names carry plan/option noise that reads badly in a headline
 *  ("… Fund - Direct Plan - Growth"). Strip the noise words first, then rebuild
 *  from the surviving dash-separated parts — removing them inline would eat the
 *  separators the next pattern needs, leaving a stray "Growth" behind. */
const shortName = (n: string) =>
  n
    .replace(/\b(direct|regular)\s*(plan)?\b/gi, "")
    .replace(/\b(growth|idcw|dividend)\s*(option|plan|payout|reinvestment)?\b/gi, "")
    .split(/[-–—]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" - ")
    .replace(/\s{2,}/g, " ")
    .trim();

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const f = await getFund(Number(code));
  if (!f) return { title: "Fund not found" };
  return {
    title: `${shortName(f.meta.name)} — Fund Dissection`,
    description: `Full analysis of ${f.meta.name}: real returns vs Nifty 50, risk, rolling consistency, SIP outcomes, and the Direct-vs-Regular cost drag. Educational only, not investment advice.`,
  };
}

export default async function FundPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const f = await getFund(Number(code));

  if (!f) {
    return (
      <div className="full-bleed -my-8 sm:-my-10">
        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="pt-6">
            <p className="kicker mb-3">AI Fund Dissection</p>
            <FundSearch />
          </div>
          <div className="glass mt-10 p-8 text-center">
            <h1 className="text-xl font-bold text-white">Couldn&apos;t load that scheme</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-dim">
              Search by name above — try <span className="font-mono text-sky-300">parag parikh flexi</span> or{" "}
              <span className="font-mono text-sky-300">hdfc flexi cap</span>.
            </p>
            <Link href="/fund" className="mt-5 inline-flex text-sm text-sky-300 hover:underline">
              Back to funds →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const base = shortName(f.meta.name);
  const [nav, thesis, news] = await Promise.all([
    getNav(f.meta.code),
    getFundThesis(f),
    getNewsSentiment(`MF${f.meta.code}`, base),
  ]);

  const years = (f.latest.t - f.inception) / (365.25 * 86_400_000);

  // Only advertise sections that actually rendered.
  const sections: [string, string][] = [
    ["overview", "Overview"],
    ["briefing", "Briefing"],
    ["sentiment", "Sentiment"],
    ["returns", "Returns"],
    ...(nav ? ([["sip", "SIP"]] as [string, string][]) : []),
    ...(f.risk ? ([["risk", "Risk"]] as [string, string][]) : []),
    ...(f.rolling ? ([["rolling", "Consistency"]] as [string, string][]) : []),
    ...(f.bench ? ([["benchmark", "Vs Nifty"]] as [string, string][]) : []),
    ...(f.drag ? ([["cost", "Cost"]] as [string, string][]) : []),
    ...(f.peers.length ? ([["peers", "Peers"]] as [string, string][]) : []),
    ...(thesis ? ([["thesis", "Thesis"]] as [string, string][]) : []),
  ];

  return (
    <div className="full-bleed -my-8 sm:-my-10">
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="pt-6">
          <p className="kicker mb-3">AI Fund Dissection</p>
          <FundSearch />
          <Link
            href={`/fund/compare?f=${f.meta.code}`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-sky-300 transition hover:text-white"
          >
            Compare {base} against another fund →
          </Link>
        </div>

        <FundNav sections={sections} />

        <div className="pt-8">
          <FundHero f={f} />
        </div>

        <AiBriefing t={thesis} />
        <SentimentSection news={news} index="03" />
        <Returns f={f} />

        {nav && (
          <Block id="sip" index="05" kicker="SIP simulator" title="What a monthly SIP would have done">
            <SipSim nav={nav} maxYears={years} />
          </Block>
        )}

        <Risk f={f} />
        <Rolling f={f} />
        <Benchmark f={f} />
        <Cost f={f} />
        <Peers f={f} />
        <Thesis t={thesis} />

        <Gaps asOf={f.latest.t} />

        <div className="mt-8">
          <Disclaimer />
        </div>

        <ArthaCopilot kind="fund" code={f.meta.code} symbol={`MF${f.meta.code}`} name={f.meta.name} label={base} />
      </div>
    </div>
  );
}
