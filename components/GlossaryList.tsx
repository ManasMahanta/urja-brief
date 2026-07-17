"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { slugifyTerm, type GlossaryTerm } from "@/lib/glossary";

// Alphabetical glossary with a live filter and letter jump-nav.
export default function GlossaryList({ terms }: { terms: GlossaryTerm[] }) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => [...terms].sort((a, b) => a.term.localeCompare(b.term)),
    [terms],
  );
  const q = query.trim().toLowerCase();
  const filtered = q
    ? sorted.filter(
        (t) =>
          t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q),
      )
    : sorted;

  const groups = new Map<string, GlossaryTerm[]>();
  for (const t of filtered) {
    const letter = t.term[0].toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(t);
  }
  const letters = [...groups.keys()];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {filtered.length} term{filtered.length === 1 ? "" : "s"}
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms…"
          className="w-full max-w-64 rounded-lg border border-zinc-200 bg-white/65 px-3 py-1.5 text-sm outline-none placeholder:text-zinc-400 focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.035] dark:focus:border-sky-500"
        />
      </div>

      {!q && (
        <nav aria-label="Jump to letter" className="flex flex-wrap gap-1.5">
          {letters.map((l) => (
            <a
              key={l}
              href={`#letter-${l}`}
              className="rounded-md px-2 py-0.5 font-mono text-sm font-semibold text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
            >
              {l}
            </a>
          ))}
        </nav>
      )}

      {letters.map((letter) => (
        <section key={letter} id={`letter-${letter}`} className="scroll-mt-20">
          <h2 className="font-mono text-lg font-bold text-sky-500 dark:text-sky-400">
            {letter}
          </h2>
          <dl className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white/65 dark:divide-zinc-800 dark:border-white/10 dark:bg-white/[0.035]">
            {groups.get(letter)!.map((t) => (
              <div key={t.term} className="px-5 py-3.5">
                <dt className="font-semibold">
                  <Link
                    href={`/glossary/${slugifyTerm(t.term)}`}
                    className="hover:text-sky-600 dark:hover:text-sky-400"
                  >
                    {t.term}
                  </Link>
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {t.def}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No terms match that search.
        </p>
      )}
    </div>
  );
}
