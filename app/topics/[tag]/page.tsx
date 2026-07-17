import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IssueCard from "@/components/IssueCard";
import SignupForm from "@/components/SignupForm";
import { getAllTags, getIssuesByTag } from "@/lib/issues";
import { topics, topicLabel } from "@/lib/site";

type Props = { params: Promise<{ tag: string }> };

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const label = topicLabel(tag);
  return {
    title: label,
    description: topics[tag]?.blurb ?? `Issues covering ${label}.`,
  };
}

export default async function TopicPage({ params }: Props) {
  const { tag } = await params;
  const issues = getIssuesByTag(tag);
  if (issues.length === 0) notFound();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{topicLabel(tag)}</h1>
      {topics[tag] && (
        <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
          {topics[tag].blurb}
        </p>
      )}
      <div className="mt-8 grid gap-4">
        {issues.map((issue) => (
          <IssueCard key={issue.slug} issue={issue} />
        ))}
      </div>
      <div className="mt-12 rounded-xl bg-zinc-100 p-6 dark:bg-white/[0.04]">
        <h2 className="font-semibold">
          Want {topicLabel(tag).toLowerCase()} coverage every week?
        </h2>
        <p className="mt-1 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          It&apos;s one of the standing sections in every issue.
        </p>
        <SignupForm compact />
      </div>
    </div>
  );
}
