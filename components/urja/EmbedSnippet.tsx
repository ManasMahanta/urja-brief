"use client";

import { useEffect, useState } from "react";

// "Embed this" — hands anyone a one-line iframe of the live grid widget
// (/embed/grid). Distribution: every embed is a backlink. The origin is read
// from the browser so the snippet is correct on any deploy, preview or prod.
export default function EmbedSnippet() {
  const [origin, setOrigin] = useState("https://urja-brief.vercel.app");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const snippet = `<iframe src="${origin}/embed/grid" width="360" height="200" style="border:0;border-radius:14px;overflow:hidden" title="Urja Brief — live India grid" loading="lazy"></iframe>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="urja-kicker">Put the live grid on your site</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            A free, self-updating widget — demand, renewable share, and carbon intensity. Paste this
            wherever HTML goes.
          </p>
        </div>
        <a
          href="/embed/grid"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full border border-cyan-100/20 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/85 transition hover:border-cyan-300/60 hover:text-white"
        >
          Preview ↗
        </a>
      </div>

      <div className="mt-4 flex items-stretch gap-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-cyan-100/10 bg-slate-950/60 px-3 py-2.5 font-mono text-xs text-slate-300">
          {snippet}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
