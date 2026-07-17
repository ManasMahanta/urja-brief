import type { ReactNode } from "react";
import CardActions from "@/components/radar/CardActions";

export function StatPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-400">
      {children}
    </span>
  );
}

export default function RadarCard({
  href,
  title,
  eyebrow,
  description,
  stats,
  secondaryLink,
  actions,
}: {
  href: string;
  title: string;
  eyebrow?: string;
  description?: string;
  stats: ReactNode;
  secondaryLink?: { href: string; label: string };
  // Personal Save bookmark control keyed by href. On by default; pass
  // actions={false} for compact/decorative cards that shouldn't have it.
  actions?: boolean;
}) {
  return (
    <article className="market-panel flex flex-col gap-2 rounded-xl p-5 transition hover:-translate-y-0.5 hover:border-emerald-500 dark:hover:border-emerald-400">
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {eyebrow}
        </p>
      )}
      <h3 className="font-semibold leading-snug">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          {title}
        </a>
      </h3>
      {description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {stats}
        {secondaryLink && (
          <a
            href={secondaryLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            {secondaryLink.label}
          </a>
        )}
        {actions !== false && <CardActions id={href} title={title} url={href} />}
      </div>
    </article>
  );
}
