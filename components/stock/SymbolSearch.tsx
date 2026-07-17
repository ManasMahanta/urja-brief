"use client";

// Natural-language-ish symbol search → navigates to /stock/<symbol>.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = { symbol: string; name: string; exchange: string };

export default function SymbolSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbol-search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (!cancel) {
          setResults(data.results ?? []);
          setOpen(true);
          setActive(0);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 220);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (symbol: string) => {
    setOpen(false);
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
    else if (e.key === "Enter") {
      if (results[active]) go(results[active].symbol);
      else if (q.trim()) go(q.trim().toUpperCase());
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-sky-400/50">
        <span className="text-text-mute" aria-hidden="true">⌕</span>
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search any stock — e.g. RELIANCE, TCS, NVDA, Infosys…"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-text-mute focus:outline-none"
          aria-label="Search stocks"
        />
        {loading && <span className="h-3 w-3 animate-pulse rounded-full bg-sky-400" />}
      </div>
      {open && results.length > 0 && (
        <ul className="glass absolute z-40 mt-2 max-h-80 w-full overflow-y-auto p-1.5 scroll-thin">
          {results.map((r, i) => (
            <li key={r.symbol}>
              <button
                onClick={() => go(r.symbol)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  i === active ? "bg-white/8" : "hover:bg-white/5"
                }`}
              >
                <span className="min-w-0">
                  <span className="font-mono text-sm font-semibold text-white">{r.symbol}</span>
                  <span className="ml-2 truncate text-xs text-text-mute">{r.name}</span>
                </span>
                <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-wider text-text-mute">
                  {r.exchange}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
