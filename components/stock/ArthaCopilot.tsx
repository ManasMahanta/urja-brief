"use client";

// Artha — the floating AI copilot (section 23) for the stock-dissection page.
// Named for the Sanskrit "artha" (wealth/prosperity) and the Arthashastra, the
// classical Indian treatise on economics. Stays docked bottom-right while you
// scroll; educational only — it won't issue buy/sell calls.
//
// Portalled to <body>: the page is wrapped in .full-bleed, whose transform makes
// it the containing block for fixed descendants — which would pin Artha to the
// bottom of the document instead of the viewport.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Msg = { role: "user" | "artha"; text: string };

function Orb({ size = 22 }: { size?: number }) {
  return (
    <span
      className="artha-orb inline-block shrink-0 rounded-full bg-[conic-gradient(from_140deg,#a78bfa,#38bdf8,#22d3ee,#a78bfa)] shadow-[0_0_14px_-2px_rgba(167,139,250,0.9)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export default function ArthaCopilot({
  symbol,
  name,
  kind = "stock",
  code,
  label,
}: {
  symbol: string;
  name: string;
  kind?: "stock" | "fund";
  code?: number;
  label?: string;
}) {
  const ticker = label ?? symbol.replace(/\.(NS|BO)$/, "");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const suggestions =
    kind === "fund"
      ? [`What kind of fund is this?`, `Is the drawdown normal?`, `Explain the Direct vs Regular gap`, `What does beta 0.6 mean?`]
      : [`Why is ${ticker} moving?`, `Biggest risks in ${ticker}?`, `Explain the last earnings`, `How does it make money?`];

  // Esc to close; focus the input when opened.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setError("");
    const next = [...messages, { role: "user" as const, text: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }));
    try {
      const res = await fetch("/api/stock-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "copilot", kind, code, symbol, name, question, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Artha is unavailable right now.");
      else setMessages((m) => [...m, { role: "artha", text: data.reply }]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }));
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={`Ask Artha about ${ticker}`}
          className="artha-nudge group fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full border border-white/15 bg-[#0b1220]/90 py-2.5 pl-2.5 pr-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl transition hover:border-violet-400/40"
        >
          <span className="relative flex items-center justify-center">
            <span className="artha-ring absolute h-9 w-9 rounded-full border border-violet-400/60" />
            <Orb size={30} />
          </span>
          <span className="text-left">
            <span className="block text-sm font-semibold leading-tight text-white">Ask Artha</span>
            <span className="block font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">
              23 · AI copilot
            </span>
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Artha AI copilot"
          className="artha-panel glass fixed bottom-5 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-[24rem] flex-col overflow-hidden sm:right-5"
          style={{ height: "min(32rem, calc(100svh - 6rem))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Orb size={26} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight text-white">
                  Artha
                  <span className="live-dot h-1.5 w-1.5" />
                </p>
                <p className="truncate font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">
                  23 · AI copilot · {ticker}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close Artha"
              className="shrink-0 rounded-lg px-2 py-1 text-text-mute transition hover:bg-white/5 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="artha-msg">
                <div className="flex gap-2.5">
                  <Orb size={22} />
                  <p className="rounded-xl rounded-tl-sm border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm leading-relaxed text-text-dim">
                    Hi — I&apos;m <span className="font-semibold text-white">Artha</span>. Ask me anything
                    about <span className="font-semibold text-white">{name}</span> — the business, its
                    numbers, risks, or the last earnings. I explain and teach; I don&apos;t give buy or
                    sell calls.
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 pl-8">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.7rem] text-text-dim transition hover:border-violet-400/40 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="artha-msg ml-auto max-w-[88%] rounded-xl rounded-br-sm bg-sky-500/15 px-3.5 py-2.5 text-sm leading-relaxed text-white">
                  {m.text}
                </div>
              ) : (
                <div key={i} className="artha-msg flex gap-2.5">
                  <Orb size={22} />
                  <div className="max-w-[88%] whitespace-pre-line rounded-xl rounded-tl-sm border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm leading-relaxed text-text-dim">
                    {m.text}
                  </div>
                </div>
              ),
            )}

            {busy && (
              <div className="artha-msg flex items-center gap-2.5">
                <Orb size={22} />
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="artha-dot h-1.5 w-1.5 rounded-full bg-violet-400"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-xs text-rose-300">{error}</p>}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-white/10 bg-white/[0.02] p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask Artha about ${ticker}…`}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-text-mute focus:border-violet-400/50"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="rounded-lg bg-gradient-to-r from-violet-500 to-sky-500 px-3.5 py-2.5 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </>,
    document.body,
  );
}
