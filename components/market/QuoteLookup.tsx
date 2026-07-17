"use client";

import { FormEvent, useState } from "react";
import type { Quote } from "@/lib/market";

export default function QuoteLookup() {
  const [symbol, setSymbol] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = symbol.trim();
    if (!q || loading) return;
    setLoading(true);
    setError("");
    setQuote(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: q }),
      });
      const payload = (await res.json()) as { quote?: Quote; error?: string };
      if (!res.ok || !payload.quote) {
        throw new Error(payload.error ?? "Couldn't fetch that quote.");
      }
      setQuote(payload.quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch that quote.");
    } finally {
      setLoading(false);
    }
  };

  const up = quote ? quote.changePercent >= 0 : false;
  const inr = (n?: number) =>
    typeof n === "number"
      ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/[0.035]">
      <form onSubmit={lookup} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Enter an NSE symbol — e.g. RELIANCE, TCS, INFY"
          maxLength={20}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.035]"
        />
        <button
          type="submit"
          disabled={!symbol.trim() || loading}
          className="shrink-0 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Fetching…" : "Get quote"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {quote && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="font-semibold">{quote.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {quote.symbol}
                {quote.exchange ? ` · ${quote.exchange}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold tabular-nums">{inr(quote.price)}</p>
              <p
                className={`text-sm font-medium tabular-nums ${
                  up
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {quote.change >= 0 ? "+" : ""}
                {quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}
                {quote.changePercent.toFixed(2)}%)
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Prev close</dt>
              <dd className="tabular-nums">{inr(quote.previousClose)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Day range</dt>
              <dd className="tabular-nums">
                {inr(quote.dayLow)} – {inr(quote.dayHigh)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">52-wk high</dt>
              <dd className="tabular-nums">{inr(quote.week52High)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">52-wk low</dt>
              <dd className="tabular-nums">{inr(quote.week52Low)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            Data may be delayed. Educational only, not investment advice.
          </p>
        </div>
      )}
    </div>
  );
}
