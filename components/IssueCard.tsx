import Link from "next/link";
import type { IssueMeta } from "@/lib/issues";
import { formatDate } from "@/lib/issues";
import TagBadge from "@/components/TagBadge";

export default function IssueCard({ issue }: { issue: IssueMeta }) {
  return (
    <article className="glass glass-hover h-full p-5">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-text-mute">
        {formatDate(issue.date)}
      </p>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-white">
        <Link href={`/issues/${issue.slug}`} className="transition hover:text-sky-300">
          {issue.title}
        </Link>
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-text-dim">{issue.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {issue.tags.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>
    </article>
  );
}
