"use client";

// Live market layer: one poller feeds both the hero index chips and the ticker
// ribbon via context, so there's a single request every ~20s (paused when the
// tab is hidden). Quotes update in place and flash green/red on change.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Quote } from "@/lib/market";

type Flash = Record<string, "up" | "down">;
type LiveState = { quotes: Quote[]; asOf: number | null; live: boolean; flash: Flash };

const LiveCtx = createContext<LiveState | null>(null);
export const useLiveQuotes = () => useContext(LiveCtx);

const POLL_MS = 20_000;

export function LiveQuotesProvider({
  initial,
  children,
}: {
  initial: Quote[];
  children: ReactNode;
}) {
  const [quotes, setQuotes] = useState<Quote[]>(initial);
  const [asOf, setAsOf] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [flash, setFlash] = useState<Flash>({});
  const prev = useRef<Map<string, number>>(
    new Map(initial.map((q) => [q.symbol, q.price])),
  );
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    const apply = (next: Quote[]) => {
      const f: Flash = {};
      for (const q of next) {
        const before = prev.current.get(q.symbol);
        if (before !== undefined && q.price !== before) {
          f[q.symbol] = q.price > before ? "up" : "down";
        }
        prev.current.set(q.symbol, q.price);
      }
      setQuotes(next);
      setAsOf(Date.now());
      setLive(true);
      if (Object.keys(f).length) {
        setFlash(f);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => active && setFlash({}), 900);
      }
    };

    const poll = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { quotes?: Quote[] };
        if (active && Array.isArray(data.quotes) && data.quotes.length) {
          apply(data.quotes);
        }
      } catch {
        /* keep the last good snapshot */
      }
    };

    const id = setInterval(poll, POLL_MS);
    const onVis = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVis);
    poll(); // sync once shortly after mount

    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  return (
    <LiveCtx.Provider value={{ quotes, asOf, live, flash }}>
      {children}
    </LiveCtx.Provider>
  );
}

function fmtTime(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

/** Live "as of HH:MM:SS IST" status pill. */
export function LiveStatus() {
  const s = useLiveQuotes();
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-mute">
      <span className={s?.live ? "live-dot" : "inline-block h-[0.45rem] w-[0.45rem] rounded-full bg-text-mute"} />
      {s?.live && s.asOf ? `Live · ${fmtTime(s.asOf)} IST` : "Snapshot · syncing…"}
    </span>
  );
}

/** The four headline index chips, updating in place. */
export function LiveIndexChips() {
  const s = useLiveQuotes();
  const quotes = (s?.quotes ?? []).slice(0, 4);
  return (
    <div className="flex flex-wrap gap-2.5">
      {quotes.map((q) => {
        const up = q.changePercent >= 0;
        const fl = s?.flash[q.symbol];
        return (
          <div
            key={q.symbol}
            className={`glass px-3.5 py-2 ${fl === "up" ? "flash-up" : fl === "down" ? "flash-down" : ""}`}
          >
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-text-mute">{q.name}</p>
            <p className="tabular mt-0.5 flex items-baseline gap-2 font-mono text-sm font-semibold text-white">
              {q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              <span className={`tabular text-[0.72rem] ${up ? "text-up" : "text-down"}`}>
                {up ? "▲" : "▼"} {up ? "+" : ""}
                {q.changePercent.toFixed(2)}%
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Full-width marquee ribbon, fed by the same live poll. */
export function LiveTicker() {
  const s = useLiveQuotes();
  const quotes = s?.quotes ?? [];
  if (!quotes.length) return null;
  const track = [...quotes, ...quotes];
  return (
    <div className="marquee border-y border-white/10 bg-[#070c16]/80 py-2.5 backdrop-blur">
      <div className="marquee__track">
        {track.map((q, i) => {
          const up = q.changePercent >= 0;
          const fl = s?.flash[q.symbol];
          return (
            <span
              key={`${q.symbol}-${i}`}
              className={`mx-5 inline-flex items-baseline gap-2 whitespace-nowrap rounded px-1 ${fl === "up" ? "flash-up" : fl === "down" ? "flash-down" : ""}`}
            >
              <span className="font-mono text-xs font-semibold tracking-wide text-text-dim">{q.name}</span>
              <span className="tabular font-mono text-xs font-semibold text-white">
                {q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
              <span className={`tabular font-mono text-xs font-semibold ${up ? "text-up" : "text-down"}`}>
                {up ? "▲" : "▼"} {up ? "+" : ""}
                {q.changePercent.toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
