import { Suspense } from "react";
import Link from "next/link";
import GenerationDesk from "@/components/urja/GenerationDesk";
import PowerAnalyst from "@/components/urja/PowerAnalyst";

export const metadata = {
  title: "Generation Desk",
  description: "A source-aware desk for understanding India's daily electricity generation mix.",
};

const fuels = [
  { name: "Coal & lignite", label: "Dispatchable backbone", detail: "A large share of firm generation. Read it alongside fuel availability, unit availability, demand, and the reporting period—not as a standalone verdict." },
  { name: "Hydro", label: "Seasonal flexibility", detail: "Water availability and reservoir conditions shape both output and flexibility. A daily movement should not be generalized beyond the season or region." },
  { name: "Nuclear", label: "Stable output", detail: "Often read as steady baseload, but outages and maintenance still matter. Installed capacity and daily output are different measures." },
  { name: "Solar & wind", label: "Weather-linked output", detail: "Variable generation is expected to move with irradiance, wind conditions, and time of day. Capacity additions do not guarantee a matching daily output change." },
];

export default function GenerationPage() {
  return <div className="flex flex-col gap-12 pb-8">
    <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
      <div className="urja-lines" aria-hidden="true" />
      <div className="relative max-w-3xl"><p className="urja-kicker">Generation desk</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Understand the mix before interpreting the number.</h1><p className="mt-5 text-lg leading-relaxed text-slate-300">India&apos;s generation story is a changing system of thermal, hydro, nuclear, solar, and wind. This desk makes the reporting structure legible without pretending a headline is a dispatch record.</p><a href="#official" className="mt-7 inline-block rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Go to official reports</a></div>
    </section>

    <section><div className="mb-6"><p className="urja-kicker">How to read generation</p><h2 className="mt-3 text-3xl font-semibold">Each fuel answers a different question.</h2></div><div className="grid gap-4 md:grid-cols-2">{fuels.map((fuel, index) => <article key={fuel.name} className="urja-panel p-5"><p className="font-mono text-xs text-cyan-300/70">0{index + 1}</p><h3 className="mt-4 text-xl font-semibold">{fuel.name}</h3><p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-cyan-200/70">{fuel.label}</p><p className="mt-3 text-sm leading-relaxed text-slate-400">{fuel.detail}</p></article>)}</div></section>

    <section id="official" className="scroll-mt-24"><div className="mb-6"><p className="urja-kicker">Evidence desk</p><h2 className="mt-3 text-3xl font-semibold">Start with the report, then ask why it changed.</h2></div><Suspense fallback={<div className="urja-panel h-72 animate-pulse" />}><GenerationDesk /></Suspense></section>

    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-6"><p className="font-mono text-xs uppercase tracking-[0.16em] text-amber-200">Desk rule</p><h2 className="mt-3 text-xl font-semibold text-amber-50">Published generation is not a forecast.</h2><p className="mt-3 text-sm leading-relaxed text-amber-100/75">The desk avoids forward calls about demand, renewable output, or fuel supply. When a report is late or unavailable, it says so instead of filling the gap with an estimate.</p></div><PowerAnalyst /></section>

    <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/">← Back to the live desk</Link>
  </div>;
}
