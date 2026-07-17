"use client";

import { FormEvent, useState } from "react";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const SUGGESTIONS = ["RELIANCE", "HDFCBANK", "TCS", "INFY", "TATAMOTORS", "SBIN"];

// Renders the GLM markdown reply as lightly-styled text: ### headings become
// bold labels, everything else is plain paragraphs. No external md library.
function DeepDiveBody({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("###")) {
          return (
            <p key={i} className="pt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {trimmed.replace(/^#+\s*/, "")}
            </p>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <p key={i} className="pl-4">
              • {trimmed.slice(2)}
            </p>
          );
        }
        if (/^_.*_$/.test(trimmed) || /^\*.*\*$/.test(trimmed)) {
          return (
            <p key={i} className="italic text-zinc-500 dark:text-zinc-400">
              {trimmed.replace(/^[_*]|[_*]$/g, "")}
            </p>
          );
        }
        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
}

export default function StockDeepDive() {
  const [symbol, setSymbol] = useState("");
  const [level, setLevel] = useState(LEVELS[0]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async (sym: string) => {
    const s = sym.trim();
    if (!s || loading) return;
    setLoading(true);
    setError("");
    setReply("");
    try {
      const res = await fetch("/api/explain-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: s, level }),
      });
      const payload = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !payload.reply) {
        throw new Error(payload.error ?? "The Deep-Dive could not respond.");
      }
      setReply(payload.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The Deep-Dive could not respond.");
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void run(symbol);
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-500/30 dark:from-amber-500/10 dark:to-zinc-950">
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
        Stock Deep-Dive
      </p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">
        Understand any stock in plain English.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Pick a company and a level — get what the business does, what moves the
        stock, and exactly what to research. Educational only, never a buy or
        sell call.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="NSE symbol — e.g. RELIANCE"
          maxLength={20}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/[0.035]"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/[0.035]"
        >
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!symbol.trim() || loading}
          className="shrink-0 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "Thinking…" : "Explain it"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSymbol(s);
              void run(s);
            }}
            className="rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-xs font-medium text-amber-700 hover:border-amber-400 dark:border-amber-500/20 dark:bg-white/[0.035] dark:text-amber-300"
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {reply && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-white/80 p-4 dark:border-amber-500/20 dark:bg-white/[0.035]">
          <DeepDiveBody text={reply} />
        </div>
      )}
    </div>
  );
}
