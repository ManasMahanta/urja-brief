"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SearchDoc } from "@/lib/search";

const KIND_STYLE: Record<SearchDoc["kind"], string> = {
  Issue: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Glossary: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Page: "bg-zinc-100 text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-300",
};

export default function SearchBox({ index }: { index: SearchDoc[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (q.length < 2) return [];
    const terms = q.split(/\s+/);
    return index
      .map((doc) => {
        const haystack = `${doc.title} ${doc.snippet}`.toLowerCase();
        // Every term must appear; title matches score higher.
        if (!terms.every((t) => haystack.includes(t))) return null;
        const titleLc = doc.title.toLowerCase();
        const score =
          (titleLc.includes(q) ? 100 : 0) +
          terms.filter((t) => titleLc.includes(t)).length * 10;
        return { doc, score };
      })
      .filter((x): x is { doc: SearchDoc; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((x) => x.doc);
  }, [q, index]);

  return (
    <div className="flex flex-col gap-5">
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search issues, glossary, interview questions…"
        className="w-full rounded-xl border border-zinc-200 bg-white/70 px-4 py-3 text-base outline-none placeholder:text-zinc-400 focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.035] dark:focus:border-sky-500"
      />

      {q.length >= 2 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {results.length} result{results.length === 1 ? "" : "s"} for “{query.trim()}”
        </p>
      )}

      <div className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-white/10">
        {results.map((doc, i) => (
          <Link
            key={`${doc.url}-${i}`}
            href={doc.url}
            className="group flex flex-col gap-1 bg-white/65 px-5 py-3.5 transition hover:bg-sky-50/60 dark:bg-white/[0.035] dark:hover:bg-sky-500/10"
          >
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[doc.kind]}`}>
                {doc.kind}
              </span>
              <span className="font-medium leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400">
                {doc.title}
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{doc.snippet}</p>
          </Link>
        ))}
      </div>

      {q.length >= 2 && results.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nothing matched. Try a broader term.
        </p>
      )}
      {q.length < 2 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Type at least two characters. Searches {index.length} pages, issues,
          glossary terms, and interview questions.
        </p>
      )}
    </div>
  );
}
