import Link from "next/link";
import { Suspense } from "react";
import CleanHourForecast from "@/components/urja/CleanHourForecast";
import CostCalculator from "@/components/urja/CostCalculator";
import EmbedSnippet from "@/components/urja/EmbedSnippet";
import ExplainButton from "@/components/urja/ExplainButton";
import { getCarbonNow, FACTOR_NOTE, TONE_COLOR } from "@/lib/carbon";

export const revalidate = 300;

export const metadata = {
  title: "Carbon Intensity",
  description:
    "How clean India's grid is right now, in grams of CO2 per kWh — derived live from the generation mix, with a plain 'is this a clean hour?' verdict and a personal cost-and-carbon calculator.",
};

const istTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

async function CarbonDesk() {
  const carbon = await getCarbonNow();

  if (!carbon) {
    return (
      <section className="urja-panel p-6">
        <p className="urja-kicker">Live carbon intensity</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          The MERIT generation mix is unavailable right now, so no live intensity is shown. Nothing
          is estimated in its place.
        </p>
      </section>
    );
  }

  const { snapshot, intensityGco2, today, verdict } = carbon;
  const tone = verdict ? TONE_COLOR[verdict.tone] : TONE_COLOR.average;
  // Where the current reading sits inside today's range (0 = cleanest seen today).
  const band =
    today && today.max > today.min
      ? Math.max(0, Math.min(100, ((intensityGco2 - today.min) / (today.max - today.min)) * 100))
      : null;

  return (
    <>
      <section className={`rounded-2xl border p-5 sm:p-6 ${tone.ring}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="urja-kicker">Live carbon intensity</p>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-slate-300">
            <span className="live-dot" /> MERIT · fetched {istTime(snapshot.fetchedAt)} IST
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-sm text-slate-400">Grams of CO<sub>2</sub> per kWh, right now</p>
            <p className={`mt-1 font-mono text-5xl font-semibold tracking-tight sm:text-6xl ${tone.text}`}>
              {Math.round(intensityGco2)}
              <span className="ml-2 text-lg font-normal text-slate-400">g/kWh</span>
            </p>
          </div>
          {verdict && (
            <div className="max-w-md">
              <p className={`inline-flex items-center gap-2 font-semibold ${tone.text}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                {verdict.headline}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{verdict.detail}</p>
            </div>
          )}
        </div>

        {today && band !== null && (
          <div className="mt-6">
            <div className="flex justify-between font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
              <span>Cleanest today · {Math.round(today.min)}</span>
              <span>Dirtiest today · {Math.round(today.max)}</span>
            </div>
            <div
              className="relative mt-1.5 h-2.5 w-full rounded-full"
              style={{ background: "linear-gradient(90deg, rgba(52,211,153,0.7), rgba(251,191,36,0.6), rgba(251,113,133,0.75))" }}
              aria-hidden="true"
            >
              <span
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900"
                style={{ left: `${band}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Across {today.count} samples today, median {Math.round(today.median)} g/kWh. The marker
              is where the grid sits now.
            </p>
          </div>
        )}

        <p className="mt-5 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">{FACTOR_NOTE}</p>
        <div className="mt-3">
          <ExplainButton section="carbon-intensity" />
        </div>
      </section>

      <CleanHourForecast />

      <CostCalculator intensityGco2={intensityGco2} />
    </>
  );
}

export default function CarbonPage() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Carbon desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Is this a clean hour?
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Every kilowatt-hour on India&apos;s grid carries a different amount of CO<sub>2</sub>
            depending on what&apos;s generating it at that instant. Solar-heavy afternoons are clean;
            the coal-carried evening peak is not. This desk reads that live from the generation mix —
            and tells you, plainly, whether now is a good time to run heavy loads.
          </p>
        </div>
      </section>

      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-2xl border border-cyan-100/10 bg-[#05070d]" />}
      >
        <CarbonDesk />
      </Suspense>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Why intensity swings",
            detail:
              "At 1pm, solar can be a third of all generation and coal eases off — clean power. After sunset, solar vanishes but demand peaks, so coal ramps hard. The same unit of electricity can more than double its CO2 between afternoon and evening.",
          },
          {
            title: "What 'clean hour' means for you",
            detail:
              "Shift flexible loads — the geyser, the dishwasher, an EV charge — into the cleaner, often cheaper windows. It's the one grid lever an ordinary household actually holds, and it needs no new hardware.",
          },
          {
            title: "What this number is not",
            detail:
              "It's an operational estimate from a live mix, not an audited emissions figure. It counts what's burning at the stack now, not the lifecycle of building the plants. For the official grid emission factor, the CEA CO2 Baseline Database is the record.",
          },
        ].map((card, index) => (
          <article key={card.title} className="urja-panel p-5">
            <p className="font-mono text-xs text-cyan-300/70">0{index + 1}</p>
            <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.detail}</p>
          </article>
        ))}
      </section>

      <EmbedSnippet />

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/grid">
        ← Grid desk
      </Link>
    </div>
  );
}
