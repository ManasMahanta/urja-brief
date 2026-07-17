import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { adjacentIssues, formatDate, getAllIssues, getIssue } from "@/lib/issues";
import { site } from "@/lib/site";
import TagBadge from "@/components/TagBadge";
import InlineCTA from "@/components/InlineCTA";
import Disclaimer from "@/components/Disclaimer";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllIssues().map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) return {};
  return {
    title: issue.title,
    description: issue.summary,
    openGraph: {
      title: issue.title,
      description: issue.summary,
      type: "article",
      publishedTime: issue.date,
      url: `${site.url}/issues/${issue.slug}`,
    },
  };
}

export default async function IssuePage({ params }: Props) {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) notFound();

  const { prev, next } = adjacentIssues(slug);
  const shareUrl = encodeURIComponent(`${site.url}/issues/${issue.slug}`);
  const shareText = encodeURIComponent(`${issue.title} — ${site.name}`);

  return (
    <article>
      <header>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatDate(issue.date)}
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {issue.title}
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          {issue.summary}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {issue.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          <span className="mx-1 text-zinc-300 dark:text-zinc-700">·</span>
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
          >
            Share on X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
          >
            Share on LinkedIn
          </a>
        </div>
      </header>

      <div className="prose prose-zinc mt-8 max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-sky-600 dark:prose-a:text-sky-400">
        <MDXRemote source={issue.content} />
      </div>

      <div className="mt-8">
        <Disclaimer compact />
      </div>

      <InlineCTA heading="Get the next issue in your inbox" />

      <nav className="mt-10 flex flex-col gap-3 border-t border-zinc-200 pt-6 text-sm sm:flex-row sm:justify-between dark:border-white/10">
        {prev ? (
          <Link
            href={`/issues/${prev.slug}`}
            className="text-zinc-600 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
          >
            ← Older: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/issues/${next.slug}`}
            className="text-zinc-600 hover:text-sky-600 sm:text-right dark:text-zinc-400 dark:hover:text-sky-400"
          >
            Newer: {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
