import Link from "next/link";
import { Suspense } from "react";
import PlainEnglish from "@/components/urja/PlainEnglish";
import CleanHourForecast from "@/components/urja/CleanHourForecast";
import CostCalculator from "@/components/urja/CostCalculator";
import EmbedSnippet from "@/components/urja/EmbedSnippet";
import ExplainButton from "@/components/urja/ExplainButton";
import { getCarbonNow, FACTOR_NOTE, TONE_COLOR, MARGINAL_GCO2 } from "@/lib/carbon";

// Grid carbon intensity elsewhere, for context (approximate recent averages,
// gCO2/kWh). India's own figure is read live and slotted in.
const WORLD_GRIDS: Array<{ name: string; g: number }> = [
  { name: "Norway", g: 30 },
  { name: "France", g: 56 },
  { name: "EU average", g: 250 },
  { name: "Germany", g: 350 },
  { name: "United States", g: 369 },
  { name: "World average", g: 480 },
  { name: "China", g: 538 },
];

const tph = (v: number) => `${Math.round(v).toLocaleString("en-IN")} t/hr`;

export const revalidate = 300;
// Renders dynamically (live MERIT fetch with retries); give the retries room so
// a slow upstream falls back gracefully instead of timing the function out.
export const maxDuration = 30;

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

  const { snapshot, intensityGco2, today, verdict, rateTonnesPerHour, avoidedTonnesPerHour, cleanGenMw } = carbon;
  const tone = verdict ? TONE_COLOR[verdict.tone] : TONE_COLOR.average;
  const carYears = rateTonnesPerHour / 4.6; // avg car ~4.6 tCO2/yr
  const treeYears = rateTonnesPerHour / 0.021; // a tree absorbs ~21 kg/yr
  const worldRows = [...WORLD_GRIDS, { name: "India — right now", g: Math.round(intensityGco2), live: true }]
    .sort((a, b) => a.g - b.g);
  const worldMax = Math.max(...worldRows.map((r) => r.g));
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
        <PlainEnglish>
          How dirty India&apos;s electricity is right now — the amount of climate-warming CO<sub>2</sub>
          made for each unit of power. Lower is cleaner, and it changes through the day.
        </PlainEnglish>

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

      {/* #1 — emissions rate + relatable equivalences */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">What the grid is emitting right now</p>
        <PlainEnglish>
          The total climate pollution India&apos;s power plants are pumping out this moment, and how much
          of it comes from coal versus gas.
        </PlainEnglish>
        <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-3">
          <div>
            <p className="text-sm text-slate-400">CO<sub>2</sub> emission rate</p>
            <p className="mt-1 font-mono text-4xl font-semibold text-white sm:text-5xl">
              {Math.round(rateTonnesPerHour).toLocaleString("en-IN")}
              <span className="ml-2 text-lg font-normal text-slate-400">tonnes/hr</span>
            </p>
          </div>
          <p className="text-sm text-slate-400">≈ <span className="font-mono text-slate-200">{(rateTonnesPerHour / 3.6).toFixed(1)} kg</span> every second</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-relaxed text-slate-300">
            Every hour, the grid emits as much CO<sub>2</sub> as about{" "}
            <span className="font-mono font-semibold text-white">{Math.round(carYears).toLocaleString("en-IN")} cars</span>{" "}
            do in a whole year.
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-relaxed text-slate-300">
            It would take about{" "}
            <span className="font-mono font-semibold text-white">{(treeYears / 1_000_000).toFixed(1)} million trees</span>{" "}
            a full year to absorb one hour of it.
          </div>
        </div>
      </section>

      {/* #2 — CO2 avoided by clean power */}
      <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-200">Clean power is working right now</p>
        <p className="mt-3 text-lg leading-relaxed text-slate-200">
          Renewables, hydro and nuclear are supplying{" "}
          <span className="font-mono font-semibold text-emerald-200">{Math.round(cleanGenMw).toLocaleString("en-IN")} MW</span>{" "}
          this instant — keeping roughly{" "}
          <span className="font-mono font-semibold text-emerald-200">{tph(avoidedTonnesPerHour)}</span>{" "}
          of CO<sub>2</sub> out of the air, versus burning coal for the same power.
        </p>
      </section>

      {/* #4 — marginal vs average */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Average vs marginal — what your extra load really causes</p>
        <PlainEnglish>
          If you switch on a heavy appliance right now, the extra electricity almost always comes from
          a coal plant — so your added pollution is higher than the grid&apos;s average suggests.
        </PlainEnglish>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Average intensity now</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">{Math.round(intensityGco2)}<span className="ml-1 text-sm font-normal text-slate-400">g/kWh</span></p>
          </div>
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4">
            <p className="text-xs text-slate-400">Marginal — an extra unit of demand</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-rose-300">~{MARGINAL_GCO2}<span className="ml-1 text-sm font-normal text-slate-400">g/kWh</span></p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          The average is spread across everything generating now. But when you switch on one more
          appliance, the grid meets it by ramping the cheapest spare plant — in India, almost always
          coal. So the CO<sub>2</sub> your extra load actually causes is closer to the marginal figure
          — which is exactly why shifting flexible loads to cleaner hours matters.
        </p>
      </section>

      {/* #3 — India vs the world */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">India&apos;s grid vs the world</p>
        <PlainEnglish>
          How clean or dirty India&apos;s electricity is compared with other countries. India runs dirtier
          than most because it still leans heavily on coal.
        </PlainEnglish>
        <p className="mt-2 text-sm text-slate-400">Grid carbon intensity, gCO<sub>2</sub>/kWh — India&apos;s read live, the rest recent averages.</p>
        <div className="mt-4 space-y-1.5">
          {worldRows.map((r) => (
            <div key={r.name} className="flex items-center gap-3">
              <span className={`w-40 shrink-0 text-sm ${"live" in r && r.live ? "font-semibold text-cyan-200" : "text-slate-300"}`}>{r.name}</span>
              <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-950/60">
                <span className={`absolute inset-y-0 left-0 rounded-md ${"live" in r && r.live ? "bg-cyan-400/40" : "bg-slate-400/25"}`} style={{ width: `${(r.g / worldMax) * 100}%` }} aria-hidden="true" />
                <span className="absolute inset-y-0 left-2.5 flex items-center font-mono text-xs text-slate-100">{r.g}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
          India&apos;s grid is coal-heavy, so its intensity sits well above cleaner grids — which is
          what makes every point of renewable share, and the 500 GW push, matter. Other figures are
          approximate recent national averages.
        </p>
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
