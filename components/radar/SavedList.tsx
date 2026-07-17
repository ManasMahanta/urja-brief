"use client";

import { useEffect, useState } from "react";
import type { Bookmark } from "@/components/radar/CardActions";

const BOOKMARKS_KEY = "sn-bookmarks";

export default function SavedList() {
  const [marks, setMarks] = useState<Bookmark[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem(BOOKMARKS_KEY);
        setMarks(raw ? (JSON.parse(raw) as Bookmark[]) : []);
      } catch {
        setMarks([]);
      }
    };
    sync();
    setMounted(true);
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === BOOKMARKS_KEY) sync();
    };
    window.addEventListener("sn-store", handler);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sn-store", handler);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const remove = (id: string) => {
    const next = marks.filter((m) => m.id !== id);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    setMarks(next);
    window.dispatchEvent(new CustomEvent("sn-store", { detail: BOOKMARKS_KEY }));
  };

  const clearAll = () => {
    localStorage.setItem(BOOKMARKS_KEY, "[]");
    setMarks([]);
    window.dispatchEvent(new CustomEvent("sn-store", { detail: BOOKMARKS_KEY }));
  };

  if (!mounted) return null;

  if (marks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white/50 p-8 text-center dark:border-white/12 dark:bg-white/[0.035]">
        <p className="text-lg font-semibold">Nothing saved yet</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Hit <span className="font-medium">☆ Save</span> on any stock, headline,
          or item across the site and it&apos;ll appear here — stored privately in this
          browser, no account needed.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {marks.length} saved item{marks.length === 1 ? "" : "s"} · stored in this browser
        </p>
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
        >
          Clear all
        </button>
      </div>
      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-white/10">
        {marks.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 bg-white/65 px-5 py-3.5 dark:bg-white/[0.035]"
          >
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 font-medium leading-snug hover:text-sky-600 dark:hover:text-sky-400"
            >
              {m.title}
            </a>
            <button
              type="button"
              onClick={() => remove(m.id)}
              aria-label="Remove"
              className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-500 hover:border-rose-300 hover:text-rose-600 dark:border-white/12 dark:text-zinc-400"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
