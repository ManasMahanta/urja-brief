"use client";
import { FormEvent, useState } from "react";

const prompts = ["What can this desk establish about the power sector today?", "How should I read a power-company price move here?", "Which official source should I check for daily generation?"];

export default function PowerAnalyst() {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const ask = async (value: string) => {
    const q = value.trim(); if (!q || loading) return;
    setLoading(true); setError(""); setReply("");
    try {
      const response = await fetch("/api/power-analyst", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) });
      const data = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error ?? "The analyst could not respond.");
      setReply(data.reply);
    } catch (err) { setError(err instanceof Error ? err.message : "The analyst could not respond."); }
    finally { setLoading(false); }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void ask(question); };
  return <section className="urja-panel p-5 sm:p-6"><p className="urja-kicker">Ask the AI grid analyst</p><h2 className="mt-3 text-xl font-semibold">Interrogate the current desk.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">The analyst can explain only the market cards, headlines, and source links currently on this site. It will say when the evidence is insufficient.</p><div className="mt-4 flex flex-wrap gap-2">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void ask(prompt)} className="rounded-full border border-cyan-100/15 px-3 py-1.5 text-left text-xs text-cyan-100/80 transition hover:border-cyan-300/50 hover:text-white">{prompt}</button>)}</div><form onSubmit={submit} className="mt-4"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={800} rows={3} placeholder="Ask about the available power-system signals…" className="w-full rounded-lg border border-cyan-100/15 bg-slate-950/50 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60" /><div className="mt-2 flex items-center justify-between gap-3"><span className="font-mono text-xs text-slate-500">{question.length}/800</span><button disabled={!question.trim() || loading} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50">{loading ? "Reading the desk…" : "Ask analyst"}</button></div></form>{reply && <div className="mt-4 rounded-lg border border-cyan-100/10 bg-slate-950/40 p-4 text-sm leading-relaxed text-slate-200" aria-live="polite"><p className="mb-2 font-mono text-xs uppercase tracking-wide text-cyan-300">Analyst response</p>{reply}</div>}{error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}</section>;
}
