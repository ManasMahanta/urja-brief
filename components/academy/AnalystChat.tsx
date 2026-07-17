"use client";

import { FormEvent, useState } from "react";

type Message = { role: "analyst" | "user"; text: string };

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const STARTERS = [
  "What is the P/E ratio and how do I use it?",
  "How do FII flows move the Nifty?",
  "How should a beginner start with SIPs?",
  "What should I check before applying to an IPO?",
];

export default function AnalystChat() {
  const [level, setLevel] = useState(LEVELS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    const nextMessages: Message[] = [...messages, { role: "user", text: q }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, level, messages }),
      });
      const payload = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !payload.reply) {
        throw new Error(payload.error ?? "The analyst could not respond just now.");
      }
      setMessages((cur) => [...cur, { role: "analyst", text: payload.reply! }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The analyst could not respond just now.");
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void ask(input);
  };

  const active = messages.length > 0;

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm dark:border-sky-500/30 dark:from-sky-500/10 dark:to-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
            Ask the Analyst
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Your questions about the market, answered.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Ask about any concept, term, ratio, or sector, and how to research a
            stock. It teaches — it won&apos;t tell you what to buy or sell.
          </p>
        </div>
        <label className="text-sm font-medium">
          Level
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1.5 block rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-400 dark:border-sky-500/30 dark:bg-white/[0.035]"
          >
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      {active && (
        <div
          className="mt-5 max-h-[32rem] space-y-4 overflow-y-auto rounded-xl border border-zinc-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.035]"
          aria-live="polite"
        >
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[90%] rounded-xl bg-sky-600 px-4 py-3 text-sm leading-relaxed text-white"
                  : "max-w-[95%] whitespace-pre-wrap rounded-xl bg-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-700 dark:bg-white/[0.04] dark:text-zinc-300"
              }
            >
              {m.role === "analyst" && (
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                  Analyst
                </p>
              )}
              {m.text}
            </div>
          ))}
          {loading && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Thinking…</p>
          )}
        </div>
      )}

      {!active && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void ask(s)}
              className="rounded-full border border-sky-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-sky-700 hover:border-sky-400 dark:border-sky-500/20 dark:bg-white/[0.035] dark:text-sky-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-3">
        <label className="sr-only" htmlFor="analyst-input">
          Your question
        </label>
        <textarea
          id="analyst-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Ask about a concept, ratio, sector, or how to research a stock…"
          className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm leading-relaxed outline-none focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.035]"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{input.length}/2000</p>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
          >
            Ask
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
