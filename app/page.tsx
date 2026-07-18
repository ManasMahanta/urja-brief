import { Suspense } from "react";
import Link from "next/link";
import CleanHourBadge from "@/components/urja/CleanHourBadge";
import GridStory from "@/components/urja/GridStory";
import GridPulse from "@/components/urja/GridPulse";
import LoadCurve from "@/components/urja/LoadCurve";
import PowerBoard from "@/components/urja/PowerBoard";
import PowerBrief from "@/components/urja/PowerBrief";
import PowerAnalyst from "@/components/urja/PowerAnalyst";

// The live grid pulse fetches MERIT with retries, so this renders dynamically;
// give it headroom so a slow upstream falls back gracefully.
export const maxDuration = 30;

const lenses = [
  ["Grid", "Demand, generation, regional balance, and the operational system."],
  ["Transition", "Renewables, storage, transmission, and the capacity being built."],
  ["Reliability", "Fuel availability, weather exposure, and constraints that change outcomes."],
];

export default function Home() {
  return (
    <div className="flex flex-col gap-16 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-14 sm:px-10 sm:py-20">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">India power intelligence</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-6xl">See the system behind the switch.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">Urja Brief tracks the signals that shape India&apos;s power system: generation, demand, renewables, fuel constraints, transmission, and policy. Every number is marked by source and reporting date.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#desk" className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Open the desk</Link>
            <Link href="/methodology" className="rounded-lg border border-cyan-100/20 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/50">How we handle data</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {lenses.map(([title, detail], index) => <article key={title} className="urja-panel p-5">
          <p className="font-mono text-xs text-cyan-300/70">0{index + 1}</p>
          <h2 className="mt-5 text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{detail}</p>
        </article>)}
      </section>

      <section id="desk" className="scroll-mt-24">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="urja-kicker">The live desk</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">The power system, with its receipts.</h2></div>
          <p className="max-w-sm text-sm text-slate-400">Live market data is labelled as market context. Official reporting remains the source of record for the physical system.</p>
        </div>
        <div className="flex flex-col gap-5">
          <Suspense fallback={<div className="urja-panel h-28 animate-pulse" />}><GridStory /></Suspense>
          <Suspense fallback={<div className="urja-panel h-56 animate-pulse" />}><GridPulse /></Suspense>
          <Suspense fallback={<div className="urja-panel h-20 animate-pulse" />}><CleanHourBadge /></Suspense>
          <Suspense fallback={<div className="urja-panel h-64 animate-pulse" />}><LoadCurve /></Suspense>
          <Suspense fallback={<div className="urja-panel h-72 animate-pulse" />}><PowerBoard /></Suspense>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Suspense fallback={null}><PowerBrief /></Suspense>
        <PowerAnalyst />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="urja-panel p-6"><p className="urja-kicker">A different kind of power brief</p><h2 className="mt-3 text-2xl font-semibold">No invented readings. No unlabeled estimates.</h2><p className="mt-3 max-w-xl leading-relaxed text-slate-300">Official reports can be delayed, incomplete, or published as documents. Urja Brief says exactly what is available, what it means, and what it cannot establish. It does not turn a missing report into a confident story.</p></div>
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-6"><p className="font-mono text-xs uppercase tracking-[0.16em] text-amber-200">Source contract</p><p className="mt-3 text-sm leading-relaxed text-amber-100/80">Physical-system facts point to official reporting. Interpretation points to the source and date. Market prices are never presented as grid conditions.</p><Link href="/methodology" className="mt-4 inline-block text-sm font-semibold text-amber-200 hover:text-white">Read the methodology →</Link></div>
      </section>
    </div>
  );
}
