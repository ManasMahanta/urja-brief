"use client";

// Interactive, client-side dissection tools: the persona explainer (calls
// /api/stock-ai) and the scenario simulator (clearly-labelled illustrative
// impacts). The Q&A copilot now lives in the floating ArthaCopilot.

import { useState } from "react";

const PERSONAS = ["Beginner", "Retail investor", "Financial advisor", "Portfolio manager", "Hedge fund analyst", "CFO"];

/* --- 24. Explain like different personas -------------------------------- */
export function PersonaExplainer({ symbol, name }: { symbol: string; name: string }) {
  const [persona, setPersona] = useState<string>("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const pick = async (p: string) => {
    setPersona(p);
    setBusy(true);
    setText("");
    try {
      const res = await fetch("/api/stock-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "persona", symbol, name, persona: p }),
      });
      const data = await res.json();
      setText(res.ok ? data.reply : data.error || "AI unavailable.");
    } catch {
      setText("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass p-5">
      <p className="text-sm text-text-dim">Re-explain {name} for a different audience:</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PERSONAS.map((p) => (
          <button
            key={p}
            onClick={() => pick(p)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              persona === p ? "border-violet-400/50 bg-violet-400/10 text-white" : "border-white/10 bg-white/[0.03] text-text-mute hover:text-text-dim"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="mt-4 min-h-[5rem] rounded-xl border border-white/10 bg-white/[0.02] p-4">
        {busy ? (
          <div className="flex items-center gap-1.5 text-text-mute">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" style={{ animationDelay: "0.2s" }} />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" style={{ animationDelay: "0.4s" }} />
          </div>
        ) : text ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-dim">{text}</p>
        ) : (
          <p className="text-sm text-text-mute">Pick a persona to get a tailored explanation.</p>
        )}
      </div>
    </div>
  );
}

/* --- 20. AI Scenario Simulator (illustrative) -------------------------- */
const SCENARIOS = [
  { id: "rates", label: "Rates +1%", rev: -2, eps: -4, val: -6, prob: "Medium", note: "Higher discount rate compresses multiples" },
  { id: "oil", label: "Oil +20%", rev: 1, eps: -3, val: -2, prob: "Medium", note: "Input-cost pressure for most sectors" },
  { id: "recession", label: "Global recession", rev: -8, eps: -15, val: -20, prob: "Low", note: "Demand shock across the book" },
  { id: "inflation", label: "Sticky inflation", rev: 3, eps: -1, val: -5, prob: "Medium", note: "Pricing power vs. margin squeeze" },
  { id: "ai", label: "AI capex doubles", rev: 6, eps: 9, val: 14, prob: "Medium", note: "Tailwind for tech & enablers" },
  { id: "inr", label: "INR −3%", rev: 2, eps: 3, val: 2, prob: "Medium", note: "Exporters benefit, importers hurt" },
];

function ImpactRow({ label, v }: { label: string; v: number }) {
  const up = v >= 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-mute">{label}</span>
      <span className={`tabular font-mono text-sm font-semibold ${up ? "text-up" : "text-down"}`}>
        {up ? "+" : ""}
        {v}%
      </span>
    </div>
  );
}

export function ScenarioSim() {
  const [id, setId] = useState(SCENARIOS[4].id);
  const s = SCENARIOS.find((x) => x.id === id)!;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="glass p-5">
        <p className="text-sm text-text-dim">Simulate a macro shock and see the illustrative impact:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SCENARIOS.map((x) => (
            <button
              key={x.id}
              onClick={() => setId(x.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                id === x.id ? "border-sky-400/40 bg-sky-400/10 text-white" : "border-white/10 bg-white/[0.03] text-text-mute hover:text-text-dim"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-text-dim">{s.note}.</p>
      </div>
      <div className="glass rail p-5" style={{ ["--rail" as string]: s.val >= 0 ? "#34d399" : "#fb7185" }}>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-mute">Illustrative impact</p>
          <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-text-dim">
            {s.prob} prob.
          </span>
        </div>
        <div className="mt-3 space-y-2.5">
          <ImpactRow label="Revenue" v={s.rev} />
          <ImpactRow label="EPS" v={s.eps} />
          <ImpactRow label="Valuation" v={s.val} />
        </div>
        <p className="mt-3 text-[0.66rem] leading-snug text-text-mute">
          Directional illustration only — not modelled on this company&apos;s
          actuals. A real simulator needs company financials.
        </p>
      </div>
    </div>
  );
}
