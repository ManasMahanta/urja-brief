"use client";

import { useState } from "react";

// The "Explain simply" pill that sits in a section header. Sends only the
// section key; the server rebuilds the section's live context itself. The
// result is labelled as generated interpretation, per the methodology page.
export default function ExplainButton({ section }: { section: string }) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (explanation || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });
      const data = (await response.json()) as { explanation?: string; error?: string };
      if (!response.ok || !data.explanation) {
        throw new Error(data.error ?? "The explainer could not respond.");
      }
      setExplanation(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The explainer could not respond.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100/20 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/85 transition hover:border-cyan-300/60 hover:text-white"
      >
        <span aria-hidden="true">✦</span>
        {open ? "Hide simple explanation" : "Explain simply"}
      </button>
      {open && (
        <div
          className="mt-3 rounded-lg border border-cyan-100/10 bg-slate-950/45 p-4"
          aria-live="polite"
        >
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-cyan-300">
            AI simple explanation · generated, not the record
          </p>
          {loading && <p className="mt-2 text-sm text-slate-400">Reading this section&apos;s live data…</p>}
          {explanation && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{explanation}</p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          {explanation && (
            <p className="mt-3 border-t border-cyan-100/10 pt-2 text-[0.7rem] leading-relaxed text-slate-500">
              Written by AI from the numbers currently on this section. It simplifies; it does not
              add facts. See the <a href="/methodology" className="text-cyan-300 hover:text-white">methodology</a>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
