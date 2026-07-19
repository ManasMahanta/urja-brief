import { Suspense } from "react";
import Link from "next/link";
import EvMapLoader from "@/components/ev/EvMapLoader";
import RunningCost from "@/components/ev/RunningCost";
import TcoBreakeven from "@/components/ev/TcoBreakeven";
import ExplainButton from "@/components/urja/ExplainButton";
import { countStationsByState, getChargingStations, getIndiaStates, getOfficialCounts } from "@/lib/ev";
import { getEvHeadlines } from "@/lib/power";
import ev from "@/data/ev.json";

const barColor = (accent: string) =>
  accent === "emerald" ? "bg-emerald-400/70" : accent === "cyan" ? "bg-cyan-400/60" : "bg-slate-400/50";

export const revalidate = 3600;
// The live Overpass fetch can take ~20s; give the ISR render room beyond the
// hobby default. Falls back to the committed OSM snapshot either way.
export const maxDuration = 60;

export const metadata = {
  title: "EV Charging",
  description:
    "India's EV-charging desk: an interactive 3D map of every charging station we can verify from open sources, with the coverage gap stated plainly.",
};

async function EvMap() {
  const states = getIndiaStates();
  const { stations, bySource } = await getChargingStations();
  const countsByState = countStationsByState(stations, states);
  const top = Object.entries(countsByState)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <>
      <EvMapLoader
        stations={stations.map((s) => ({
          name: s.name,
          city: s.city,
          state: s.state,
          lat: s.lat,
          lng: s.lng,
          source: s.source,
          pricing: s.pricing,
        }))}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="urja-panel p-5">
          <p className="urja-kicker">What the map shows — and what it can&apos;t</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            <span className="font-mono text-cyan-200">{stations.length.toLocaleString("en-IN")}</span>{" "}
            stations from open sources: {bySource["e-AMRIT"].toLocaleString("en-IN")} from NITI
            Aayog&apos;s e-AMRIT endpoint (the old EESL pilot list, real coordinates) and{" "}
            {bySource.OSM.toLocaleString("en-IN")} community-mapped on OpenStreetMap.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            India&apos;s official registry (BEE&apos;s EV Yatra) reports tens of thousands of public
            stations, but publishes no open bulk feed we could verify. So this map is an honest
            subset — city-skewed, community-dependent — not the universe. Treat blank districts as
            unmapped, not unserved.
          </p>
          <div className="mt-3">
            <ExplainButton section="ev-desk" />
          </div>
        </section>
        <section className="urja-panel p-5">
          <p className="urja-kicker">Most mapped stations</p>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-cyan-100/10">
              {top.map(([state, count]) => (
                <tr key={state}>
                  <td className="py-1.5 pr-3 text-slate-300">{state}</td>
                  <td className="py-1.5 text-right font-mono text-slate-100">{count.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 border-t border-cyan-100/10 pt-2 text-xs leading-relaxed text-slate-500">
            Counts of mapped stations only — a ranking of mapping activity as much as of
            infrastructure.
          </p>
        </section>
      </div>
    </>
  );
}

async function OfficialCounts() {
  const records = await getOfficialCounts();
  if (!records.length) return null;
  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Official count (Ministry of Heavy Industries)</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <tbody className="divide-y divide-cyan-100/10 font-mono text-slate-300">
            {records.slice(0, 12).map((row, i) => (
              <tr key={i}>
                {Object.values(row).slice(0, 4).map((value, j) => (
                  <td key={j} className="py-2 pr-4">{String(value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 border-t border-cyan-100/10 pt-2 text-xs text-slate-500">
        Source: data.gov.in, year-wise public charging stations deployed.
      </p>
    </section>
  );
}

async function EvWire() {
  const headlines = await getEvHeadlines(8);
  if (!headlines.length) return null;
  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">EV charging newswire</p>
        <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          Google News · last 30 days
        </span>
      </div>
      <div className="mt-4 divide-y divide-cyan-100/10">
        {headlines.map((headline) => (
          <a
            key={headline.url}
            href={headline.url}
            target="_blank"
            rel="noreferrer"
            className="block py-3 text-sm font-medium leading-snug text-slate-200 transition hover:text-cyan-200"
          >
            {headline.title}
          </a>
        ))}
      </div>
    </section>
  );
}

export default function EvPage() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">EV charging desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            The grid&apos;s newest customer.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Every EV is a moving electricity demand, and charging stations are where it lands on
            the grid. This desk maps every station we can verify from open sources — in 3D, with
            the coverage gap stated plainly instead of papered over.
          </p>
        </div>
      </section>

      <Suspense
        fallback={<div className="h-[26rem] animate-pulse rounded-xl border border-cyan-100/10 bg-[#05070d] sm:h-[30rem]" />}
      >
        <EvMap />
      </Suspense>

      <RunningCost />

      <TcoBreakeven />

      {/* Adoption tracker — who's actually going electric */}
      <section className="urja-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="urja-kicker">Who&apos;s actually going electric</p>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
            {ev.adoption.penetrationPct}% of all new vehicles · {ev.asOf}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
            <p className="text-xs text-slate-400">EV penetration</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-cyan-200">{ev.adoption.penetrationPct}%</p>
            <p className="mt-1 text-xs text-slate-500">of every vehicle sold</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">EVs sold a year</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">~{ev.adoption.annualUnitsLakh}<span className="ml-1 text-sm font-normal text-slate-400">lakh</span></p>
            <p className="mt-1 text-xs text-slate-500">across all categories</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">EVs on the road</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">~{ev.adoption.cumulativeFleetLakh}<span className="ml-1 text-sm font-normal text-slate-400">lakh</span></p>
            <p className="mt-1 text-xs text-slate-500">cumulative fleet</p>
          </div>
        </div>
        <p className="mt-5 font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
          Share of EV sales, by segment
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {ev.adoption.categories.map((c) => (
            <div key={c.segment} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 truncate text-slate-300">{c.segment}</span>
              <span className="relative h-5 flex-1 overflow-hidden rounded bg-slate-950/60">
                <span className={`absolute inset-y-0 left-0 rounded ${barColor(c.accent)}`} style={{ width: `${c.salesSharePct}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-slate-100">{c.salesSharePct}%</span>
              <span className="hidden w-28 shrink-0 text-right font-mono text-[0.7rem] text-slate-500 sm:block">
                {c.penetrationPct}% of its class
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{ev.adoption.why}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{ev.adoption.note}</p>
      </section>

      {/* What EVs mean for the grid — links back to the grid desk */}
      <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">What EVs mean for the grid</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Today&apos;s EV charging load</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">~{ev.gridLoad.fleetTwhPerYear}<span className="ml-1 text-sm font-normal text-slate-400">TWh/yr</span></p>
            <p className="mt-1 text-xs text-slate-500">under {ev.gridLoad.shareOfDemandPct}% of demand</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">If {ev.gridLoad.scenarioTwoWheelerSharePct}% of 2-wheelers went electric</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">+{ev.gridLoad.scenarioAddedTwhPerYear}<span className="ml-1 text-sm font-normal text-slate-400">TWh/yr</span></p>
            <p className="mt-1 text-xs text-slate-500">≈ +{ev.gridLoad.scenarioAddedGwAvg} GW average load</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">The real variable</p>
            <p className="mt-1 text-lg font-semibold text-cyan-200">When they charge</p>
            <p className="mt-1 text-xs text-slate-500">peak vs the duck curve</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-cyan-100/80">{ev.gridLoad.why}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{ev.gridLoad.note}</p>
        <Link href="/renewables#duck" className="mt-3 inline-block text-sm font-semibold text-cyan-300 hover:text-white">
          See the duck curve on the renewables desk →
        </Link>
      </section>

      {/* State EV incentives lookup */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">State EV incentives, side by side</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-cyan-100/10 text-left font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-normal">State</th>
                <th className="py-2 pr-4 font-normal">Road tax</th>
                <th className="py-2 font-normal">Purchase subsidy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-100/10">
              {ev.incentives.map((row) => (
                <tr key={row.state}>
                  <td className="py-2.5 pr-4 font-medium text-slate-200">{row.state}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.accent === "emerald" ? "bg-emerald-300/10 text-emerald-300" : "bg-cyan-300/10 text-cyan-200"}`}>
                      {row.roadTax}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400">{row.subsidy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">{ev.incentivesNote}</p>
      </section>

      <Suspense fallback={null}>
        <OfficialCounts />
      </Suspense>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Why chargers are a grid story",
            detail:
              "A fast charger draws 60–240 kW — tens of households' worth of demand at one plug. Clusters of them change local load shapes, which is why DISCOMs and CEA connection rules, not just automakers, decide the rollout pace.",
          },
          {
            title: "Where the official record lives",
            detail:
              "BEE's EV Yatra portal is the Central Nodal Agency's registry, and the Ministry of Heavy Industries publishes deployed-station counts. Neither offers an open bulk location feed today — when one appears, this map jumps from subset to census.",
          },
          {
            title: "Reading the map honestly",
            detail:
              "OpenStreetMap density tracks where mappers live as much as where chargers are. Delhi looking dense and a highway looking empty can both be mapping artefacts — the absence of a dot is not the absence of a charger.",
          },
        ].map((card, index) => (
          <article key={card.title} className="urja-panel p-5">
            <p className="font-mono text-xs text-cyan-300/70">0{index + 1}</p>
            <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.detail}</p>
          </article>
        ))}
      </section>

      <Suspense fallback={null}>
        <EvWire />
      </Suspense>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/">
        ← Back to the live desk
      </Link>
    </div>
  );
}
