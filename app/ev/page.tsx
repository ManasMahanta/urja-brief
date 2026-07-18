import { Suspense } from "react";
import Link from "next/link";
import EvMapLoader from "@/components/ev/EvMapLoader";
import RunningCost from "@/components/ev/RunningCost";
import ExplainButton from "@/components/urja/ExplainButton";
import { countStationsByState, getChargingStations, getIndiaStates, getOfficialCounts } from "@/lib/ev";
import { getEvHeadlines } from "@/lib/power";

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
