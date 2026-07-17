import type { Metadata } from "next";
import IssueCard from "@/components/IssueCard";
import InlineCTA from "@/components/InlineCTA";
import { getFeaturedIssues } from "@/lib/issues";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Start Here",
  description: `New to ${site.name}? These issues show you exactly what you'll get.`,
};

export default function StartHerePage() {
  const featured = getFeaturedIssues();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Start here</h1>
      <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
        New to {site.name}? Don&apos;t take the pitch on faith — read these
        issues first. They&apos;re representative of what lands in your inbox{" "}
        {site.cadence.toLowerCase()}.
      </p>
      <div className="mt-8 grid gap-4">
        {featured.map((issue) => (
          <IssueCard key={issue.slug} issue={issue} />
        ))}
      </div>
      <InlineCTA heading="Convinced?" />
    </div>
  );
}
