import type { ReactNode } from "react";

// A one-line, always-visible plain-English explanation of what a section's
// metric actually means — written for someone with no energy background. Sits
// right under the section heading, in the site's muted subtitle voice but
// flagged so a layman knows it's the friendly translation.
export default function PlainEnglish({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-400">
      <span className="rounded bg-cyan-300/10 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wide text-cyan-200/80">
        In plain English
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}
