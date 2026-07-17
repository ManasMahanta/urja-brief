import type { Metadata } from "next";
import Disclaimer from "@/components/Disclaimer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `${site.name} publishes educational market commentary, not investment advice. Read the full disclaimer.`,
};

export default function DisclaimerPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="pt-6">
        <h1 className="text-4xl font-bold tracking-tight">Disclaimer</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Please read this carefully before acting on anything you read on{" "}
          {site.name}.
        </p>
      </section>

      <Disclaimer />

      <div className="prose prose-zinc max-w-none dark:prose-invert prose-headings:tracking-tight">
        <h2>No investment advice</h2>
        <p>
          All content on {site.name} — issues, the markets dashboard, coverage
          notes, the Academy, interactive tools, and any live data — is provided for
          general informational and educational purposes only. It does not
          constitute investment, financial, legal, or tax advice, nor a
          recommendation, offer, or solicitation to buy, sell, or hold any
          security or to adopt any investment strategy.
        </p>
        <h2>Not a registered adviser</h2>
        <p>
          {site.name} and {site.author} are not registered with SEBI as
          investment advisers or research analysts. Nothing here is personalised
          to your financial situation, goals, or risk tolerance.
        </p>
        <h2>Market data</h2>
        <p>
          Live prices, index levels, and other market data are sourced from
          third-party providers, may be delayed, and can be inaccurate,
          incomplete, or unavailable at any time. Do not rely on them for
          trading decisions.
        </p>
        <h2>Automatically generated content</h2>
        <p>
          Some features (the daily brief, the Stock Deep-Dive, Ask the Analyst,
          and the weekly quiz) may be automatically generated and can contain
          errors or omissions. Always verify against primary sources.
        </p>
        <h2>Your responsibility</h2>
        <p>
          Investing in securities involves risk, including the possible loss of
          principal. Past performance is not indicative of future results. You are
          solely responsible for your own investment decisions. Always do your own
          research and consider consulting a SEBI-registered investment adviser
          before investing.
        </p>
      </div>
    </div>
  );
}
