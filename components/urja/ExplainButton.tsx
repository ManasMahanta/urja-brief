"use client";

import { useState } from "react";

type Lang = "en" | "hi";

// The "Explain simply" pill that sits in a section header, with an
// English/Hindi toggle. Sends only the section key and language; the server
// rebuilds the section's live context itself. The result is labelled as
// generated interpretation, per the methodology page.
export default function ExplainButton({ section }: { section: string }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [explanations, setExplanations] = useState<Partial<Record<Lang, string>>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (nextLang: Lang) => {
    if (explanations[nextLang] || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, lang: nextLang }),
      });
      const data = (await response.json()) as { explanation?: string; error?: string };
      if (!response.ok || !data.explanation) {
        throw new Error(data.error ?? "The explainer could not respond.");
      }
      setExplanations((prev) => ({ ...prev, [nextLang]: data.explanation }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The explainer could not respond.");
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    void load(lang);
  };

  const switchLang = (nextLang: Lang) => {
    setLang(nextLang);
    void load(nextLang);
  };

  const current = explanations[lang];

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={toggleOpen}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-cyan-300">
              AI simple explanation · generated, not the record
            </p>
            <div className="flex gap-1" role="group" aria-label="Explanation language">
              {(["en", "hi"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => switchLang(code)}
                  aria-pressed={lang === code}
                  className={`rounded px-2 py-0.5 text-[0.7rem] font-semibold transition ${
                    lang === code
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-cyan-100/20 text-cyan-200/80 hover:text-white"
                  }`}
                >
                  {code === "en" ? "English" : "हिंदी"}
                </button>
              ))}
            </div>
          </div>
          {loading && !current && (
            <p className="mt-2 text-sm text-slate-400">
              {lang === "hi" ? "इस सेक्शन का लाइव डेटा पढ़ा जा रहा है…" : "Reading this section's live data…"}
            </p>
          )}
          {current && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200" lang={lang}>
              {current}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          {current && (
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
