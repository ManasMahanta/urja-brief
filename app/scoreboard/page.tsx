import Link from "next/link";
import { getScoreboard, type Resolved } from "@/lib/forecasts";

export const revalidate = 900;

export const metadata = {
  title: "Forecast Scoreboard",
  description:
    "Dated, falsifiable calls about India's grid — graded automatically by Urja Brief's own 15-minute sampling. A public track record, hits and misses alike.",
};

const fmt = (metric: Resolved["metric"], value: number) =>
  metric === "peakDemandMw" ? `${Math.round(value).toLocaleString("en-IN")} MW` : `${value.toFixed(1)}%`;

const RESULT: Record<Resolved["result"], { label: string; ring: string; text: string; dot: string }> = {
  hit: { label: "Hit", ring: "border-emerald-300/25 bg-emerald-300/[0.06]", text: "text-emerald-300", dot: "bg-emerald-400" },
  miss: { label: "Miss", ring: "border-rose-400/25 bg-rose-400/[0.06]", text: "text-rose-300", dot: "bg-rose-400" },
  pending: { label: "Open", ring: "border-cyan-200/15 bg-slate-950/40", text: "text-cyan-200", dot: "bg-cyan-300" },
};

const METRIC_LABEL: Record<Resolved["metric"], string> = {
  peakDemandMw: "Peak demand",
  maxRePct: "Renewable share",
};

// Whole days from now (IST) until a resolve date; negative once it's passed.
const daysUntil = (isoDate: string) =>
  Math.ceil((new Date(`${isoDate}T18:30:00Z`).getTime() - Date.now()) / 86_400_000);

export default async function ScoreboardPage() {
  const { forecasts, tally } = await getScoreboard();

  // Hit-rate split by metric — are we better at demand or renewables calls?
  const byMetric = (Object.keys(METRIC_LABEL) as Resolved["metric"][]).map((metric) => {
    const settled = forecasts.filter((f) => f.metric === metric && f.result !== "pending");
    const hit = settled.filter((f) => f.result === "hit").length;
    return { metric, label: METRIC_LABEL[metric], hit, total: settled.length };
  });

  // Current streak: consecutive same-result settled calls, newest first.
  const settledNewestFirst = forecasts.filter((f) => f.result !== "pending");
  let streak = 0;
  let streakKind: "hit" | "miss" | null = null;
  for (const f of settledNewestFirst) {
    if (streakKind === null) {
      streakKind = f.result as "hit" | "miss";
      streak = 1;
    } else if (f.result === streakKind) {
      streak += 1;
    } else break;
  }

  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Forecast scoreboard</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            We make calls. We grade them.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Anyone can narrate the grid after the fact. Here we publish dated, falsifiable
            predictions — and let this site&apos;s own 15-minute sampling settle them, hit or miss.
            Nothing is quietly deleted; a wrong call stays on the board.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="urja-panel p-5">
          <p className="text-sm text-slate-400">Track record (settled calls)</p>
          <p className="mt-2 font-mono text-4xl font-semibold text-white">
            {tally.hitRate === null ? "—" : `${Math.round(tally.hitRate * 100)}%`}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {tally.hit + tally.miss === 0 ? "No calls have settled yet." : `${tally.hit} hit · ${tally.miss} missed`}
          </p>
        </article>
        <article className="urja-panel p-5">
          <p className="text-sm text-slate-400">Open calls</p>
          <p className="mt-2 font-mono text-4xl font-semibold text-cyan-200">{tally.pending}</p>
          <p className="mt-2 text-xs text-slate-500">Waiting on the grid to settle them.</p>
        </article>
        <article className="urja-panel p-5">
          <p className="text-sm text-slate-400">How they&apos;re graded</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Automatically, against the observed daily rollups on the{" "}
            <Link href="/records" className="text-cyan-300 hover:text-white">records desk</Link> — the
            same sampling, no hand-marking.
          </p>
        </article>
      </section>

      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Track record, broken down</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {byMetric.map((m) => (
            <div key={m.metric} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-400">{m.label} calls</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-white">
                {m.total === 0 ? "—" : `${m.hit}/${m.total}`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {m.total === 0 ? "none settled yet" : `${Math.round((m.hit / m.total) * 100)}% right`}
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Current streak</p>
            <p className={`mt-1 font-mono text-2xl font-semibold ${streakKind === "hit" ? "text-emerald-300" : streakKind === "miss" ? "text-rose-300" : "text-white"}`}>
              {streakKind === null ? "—" : `${streak} ${streakKind === "hit" ? "hit" : "miss"}${streak === 1 ? "" : streakKind === "hit" ? "s" : "es"}`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {streakKind === null ? "no calls settled yet" : "in a row, most recent first"}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        {forecasts.length ? (
          forecasts.map((f) => {
            const r = RESULT[f.result];
            return (
              <article key={f.id} className={`rounded-2xl border p-5 sm:p-6 ${r.ring}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${r.dot}`} aria-hidden="true" />
                    <span className={`font-mono text-xs font-semibold uppercase tracking-wide ${r.text}`}>
                      {r.label}
                      {f.resolvedEarly ? " · early" : ""}
                    </span>
                  </div>
                  <span className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
                    {f.ai && (
                      <span className="rounded border border-fuchsia-300/30 bg-fuchsia-300/10 px-1.5 py-0.5 text-fuchsia-200">AI</span>
                    )}
                    {f.auto && (
                      <span className="rounded border border-cyan-200/20 px-1.5 py-0.5 text-cyan-200/70">auto</span>
                    )}
                    Made {f.madeOn} · {f.horizon}
                  </span>
                </div>
                {f.ai && (
                  <p className="mt-2 text-xs leading-relaxed text-fuchsia-200/80">
                    This call was written by the site&apos;s AI, not a human — and it&apos;s graded by the
                    same sampling as every other. An AI that has to live with its own record.
                  </p>
                )}

                <p className="mt-3 text-lg font-semibold leading-snug text-white">{f.claim}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.basis}</p>

                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/10 pt-3 font-mono text-sm">
                  <span className="text-slate-400">
                    Target{" "}
                    <span className="text-slate-200">
                      {f.direction === "above" ? "≥ " : "≤ "}{fmt(f.metric, f.target)}
                    </span>
                  </span>
                  <span className="text-slate-400">
                    Best observed{" "}
                    <span className={r.text}>{f.observed !== null ? fmt(f.metric, f.observed) : "no data yet"}</span>
                  </span>
                  {f.result === "pending" && (() => {
                    const d = daysUntil(f.resolvesOn);
                    return (
                      <span className="text-slate-400">
                        Resolves{" "}
                        <span className="text-cyan-200">{d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}</span>
                      </span>
                    );
                  })()}
                </div>
                {f.note && <p className="mt-2 text-xs text-slate-500">{f.note}</p>}
              </article>
            );
          })
        ) : (
          <div className="urja-panel p-6">
            <p className="text-sm leading-relaxed text-slate-400">
              No calls on the board yet. They appear here the moment one is published — with its
              resolution date set in advance.
            </p>
          </div>
        )}
      </section>

      <p className="urja-panel p-5 text-xs leading-relaxed text-slate-500">
        A call resolves the instant the sampler observes the target within its window — or flips to a
        miss once its date passes unmet. Because grading reads only what the 15-minute sampler
        actually caught, a real extreme between two ticks can be missed; the target is deliberately
        set against that same observed series, so the test is fair to both sides.
      </p>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/records">
        ← Records desk
      </Link>
    </div>
  );
}
