"use client";

// Section 4 interactive core: a tabbed research explorer (thesis / financials /
// risk / earnings-call) over the demo dossier, plus a live conversational panel
// wired to /api/analyst (GLM). The live analyst is deliberately educational —
// it explains and teaches, it does not issue buy/sell calls.

import { useRef, useState } from "react";
import { DEEP_RESEARCH, RESEARCH_PROMPTS } from "@/lib/intel-data";
import { DemoBadge, ConfidenceBar } from "@/components/intel/ui";

type Tab = "thesis" | "financials" | "risk" | "call";
const TABS: { id: Tab; label: string }[] = [
  { id: "thesis", label: "Thesis" },
  { id: "financials", label: "Financials" },
  { id: "risk", label: "Risk" },
  { id: "call", label: "Earnings call" },
];

type Msg = { role: "user" | "analyst"; text: string };

function verdictTone(v: string): { color: string; ring: string } {
  if (v === "Constructive") return { color: "text-emerald-300", ring: "#34d399" };
  if (v === "Cautious") return { color: "text-rose-300", ring: "#fb7185" };
  return { color: "text-sky-300", ring: "#38bdf8" };
}

export default function DeepResearch() {
  const d = DEEP_RESEARCH;
  const [tab, setTab] = useState<Tab>("thesis");
  const [openThesis, setOpenThesis] = useState(0);

  // Conversational panel
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setError("");
    const next = [...messages, { role: "user" as const, text: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, level: "Intermediate", messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "The analyst is unavailable right now.");
      } else {
        setMessages((m) => [...m, { role: "analyst", text: data.reply }]);
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }));
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const tone = verdictTone(d.verdict);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Explorer */}
      <div className="glass p-5">
        {/* Verdict header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white">{d.symbol}</span>
              <span className="text-xs text-text-mute">{d.name}</span>
            </div>
            <p className="mt-1 text-xs text-text-mute">{d.priceContext}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold ${tone.color}`}>{d.verdict}</p>
            <p className="tabular font-mono text-[0.62rem] text-text-mute">{d.conviction}% conviction</p>
          </div>
        </div>
        <div className="mt-3">
          <ConfidenceBar value={d.conviction} tone={d.verdict === "Cautious" ? "down" : d.verdict === "Neutral" ? "azure" : "up"} />
        </div>
        <div className="mt-2">
          <DemoBadge label="AI dossier · sample" />
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                tab === t.id ? "bg-white/10 text-white" : "text-text-mute hover:text-text-dim"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-[13rem]">
          {tab === "thesis" && (
            <ul className="space-y-2">
              {d.thesis.map((s, i) => (
                <li key={i} className="rounded-lg border border-white/10 bg-white/[0.02]">
                  <button
                    onClick={() => setOpenThesis(openThesis === i ? -1 : i)}
                    className="flex w-full items-center justify-between px-3.5 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-white">{s.heading}</span>
                    <span className="text-text-mute transition" style={{ transform: openThesis === i ? "rotate(180deg)" : "none" }}>⌄</span>
                  </button>
                  {openThesis === i && (
                    <p className="px-3.5 pb-3.5 text-sm leading-relaxed text-text-dim">{s.body}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {tab === "financials" && (
            <div className="grid grid-cols-2 gap-2.5">
              {d.financials.map((f) => (
                <div key={f.metric} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[0.62rem] uppercase tracking-wider text-text-mute">{f.metric}</p>
                  <p className="tabular mt-1 font-mono text-base font-bold text-white">{f.value}</p>
                  <p className={`text-xs ${f.dir === "up" ? "text-up" : f.dir === "down" ? "text-down" : "text-text-mute"}`}>
                    {f.yoy} YoY
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === "risk" && (
            <ul className="space-y-3">
              {d.risks.map((r) => (
                <li key={r.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-dim">{r.label}</span>
                    <span className="tabular font-mono text-xs text-text-mute">{r.severity}</span>
                  </div>
                  <div className="mt-1.5">
                    <ConfidenceBar value={r.severity} tone={r.severity >= 55 ? "down" : "amber"} />
                  </div>
                  <p className="mt-1 text-xs text-text-mute">{r.note}</p>
                </li>
              ))}
            </ul>
          )}

          {tab === "call" && (
            <div className="rounded-lg border border-violet-400/20 bg-violet-400/[0.05] p-4">
              <p className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-wider text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Earnings-call summary
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-text-dim">{d.callSummary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Conversational analyst */}
      <div className="glass flex flex-col p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_10px_2px_rgba(167,139,250,0.7)]" />
            Ask the AI analyst
          </h3>
          <span className="font-mono text-[0.58rem] uppercase tracking-wider text-text-mute">AI · live</span>
        </div>
        <p className="mt-1 text-xs text-text-mute">
          Educational Q&A on companies, ratios, and how to research. It won&apos;t give buy/sell calls.
        </p>

        <div ref={scrollRef} className="scroll-thin mt-4 flex-1 space-y-3 overflow-y-auto" style={{ maxHeight: "22rem" }}>
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {RESEARCH_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-text-dim transition hover:border-sky-400/30 hover:text-white"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-sky-500/15 text-white"
                  : "border border-white/10 bg-white/[0.03] text-text-dim"
              }`}
            >
              {m.text}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-1.5 text-text-mute">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" style={{ animationDelay: "0.2s" }} />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" style={{ animationDelay: "0.4s" }} />
            </div>
          )}
          {error && <p className="text-xs text-rose-300">{error}</p>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a company, ratio, or sector…"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-text-mute focus:border-sky-400/40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-[#04121b] transition enabled:hover:brightness-110 disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
