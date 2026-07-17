"use client";

// Typeahead over AMFI's ~14k schemes. Matching is token-AND on a
// punctuation-stripped name server-side, so "sbi bluechip" finds "SBI Blue Chip".

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type Hit = { code: number; name: string; house: string; category: string };

export default function FundSearch({
  autoFocus = false,
  onPick,
  placeholder = "Search 14,000+ schemes — try “parag parikh flexi” or “sbi bluechip”",
  clearOnPick = false,
}: {
  autoFocus?: boolean;
  /** Defaults to navigating to the fund page; the comparison picker adds instead. */
  onPick?: (hit: Hit) => void;
  placeholder?: string;
  clearOnPick?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 3) {
      setHits([]);
      return;
    }
    setBusy(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fund-search?q=${encodeURIComponent(q)}`);
        const d = await res.json();
        setHits(d.results ?? []);
        setOpen(true);
      } catch {
        setHits([]);
      } finally {
        setBusy(false);
      }
    }, 220);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={box} className="relative">
      <input
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-text-mute focus:border-violet-400/50"
      />
      {busy && <span className="absolute right-4 top-3.5 h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />}

      {open && hits.length > 0 && (
        <ul className="glass scroll-thin absolute z-40 mt-2 max-h-80 w-full overflow-y-auto p-1.5">
          {hits.map((h) => (
            <li key={h.code}>
              <button
                onClick={() => {
                  setOpen(false);
                  if (clearOnPick) setQ("");
                  if (onPick) onPick(h);
                  else router.push(`/fund/${h.code}`);
                }}
                className="w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-white/5"
              >
                <p className="text-sm leading-snug text-white">{h.name}</p>
                <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-text-mute">
                  {h.house.replace(/ Mutual Fund$/, "")} · {h.category.replace(/^.*?-\s*/, "")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
