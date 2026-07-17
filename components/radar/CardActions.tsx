"use client";

import { useEffect, useState } from "react";

export type Bookmark = {
  id: string;
  title: string;
  url: string;
  savedAt: number;
};

const BOOKMARKS_KEY = "sn-bookmarks";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Notifies other mounted instances (and the Saved page) within this tab,
// since the native `storage` event only fires across tabs.
function broadcast(key: string) {
  window.dispatchEvent(new CustomEvent("sn-store", { detail: key }));
}

// Personal bookmark star for a radar item. State is per-browser in
// localStorage — no account, no server.
export default function CardActions({
  id,
  title,
  url,
}: {
  id: string;
  title: string;
  url: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => {
      const marks = read<Bookmark[]>(BOOKMARKS_KEY, []);
      setSaved(marks.some((m) => m.id === id));
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
  }, [id]);

  const toggleSave = () => {
    const marks = read<Bookmark[]>(BOOKMARKS_KEY, []);
    const next = saved
      ? marks.filter((m) => m.id !== id)
      : [{ id, title, url, savedAt: Date.now() }, ...marks];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    setSaved(!saved);
    broadcast(BOOKMARKS_KEY);
  };

  const base =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition";

  return (
    <div className="ml-auto flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={mounted && saved}
        aria-label={saved ? "Remove bookmark" : "Save bookmark"}
        title={saved ? "Saved — click to remove" : "Save to your list"}
        className={`${base} ${
          mounted && saved
            ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300"
            : "border-zinc-200 text-zinc-500 hover:border-amber-300 dark:border-white/12 dark:text-zinc-400"
        }`}
      >
        <span aria-hidden="true">{mounted && saved ? "★" : "☆"}</span> Save
      </button>
    </div>
  );
}
