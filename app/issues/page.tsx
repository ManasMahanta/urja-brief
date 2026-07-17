import type { Metadata } from "next";
import Link from "next/link";
import IssueCard from "@/components/IssueCard";
import { getAllIssues, getAllTags } from "@/lib/issues";
import { topicLabel } from "@/lib/site";

export const metadata: Metadata = {
  title: "Issue Archive",
  description: "Every past issue, readable on the web.",
};

export default function IssuesPage() {
  const issues = getAllIssues();
  const tags = getAllTags();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Issue archive</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Every issue, readable on the web. Filter by topic:
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/topics/${tag}`}
            className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 transition hover:border-sky-400 hover:text-sky-600 dark:border-white/12 dark:text-zinc-400 dark:hover:border-sky-500 dark:hover:text-sky-400"
          >
            {topicLabel(tag)}
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-4">
        {issues.map((issue) => (
          <IssueCard key={issue.slug} issue={issue} />
        ))}
      </div>
    </div>
  );
}
