import { Suspense } from "react";
import Link from "next/link";
import StorageDispatch from "@/components/urja/StorageDispatch";
import { getStorageHeadlines } from "@/lib/power";

export const revalidate = 900;

export const metadata = {
  title: "Storage",
  description:
    "India's energy-storage desk: live storage despatch from MERIT, the pumped-hydro and BESS picture, how to read a storage tender, and the storage newswire.",
};

// The three kinds of storage that matter, and what each one is for.
const kinds = [
  {
    name: "Pumped storage hydro",
    label: "The incumbent",
    detail:
      "Twin-reservoir plants that pump water uphill on surplus power and generate at peak. India's oldest and largest storage class — several GW operating, much more under construction — with decade-long build times and multi-decade lives. The CEA tracks the fleet and pipeline.",
  },
  {
    name: "Grid-scale batteries (BESS)",
    label: "The fast mover",
    detail:
      "Container-scale lithium batteries at substations, contracted through SECI and state tenders — often bundled with solar to shift afternoon energy into the evening peak. Build times are months, not decades, and tender-discovered tariffs have fallen sharply round over round.",
  },
  {
    name: "Behind-the-meter storage",
    label: "The invisible layer",
    detail:
      "Rooftop-solar batteries, telecom and datacentre backup, EVs. It never appears in despatch data — it shows up as demand that didn't happen, which makes it real but statistically invisible. Claims about it need survey data, not grid data.",
  },
];

const tenderRules = [
  {
    title: "MWh beats MW",
    detail:
      "A storage headline in MW alone is half a spec. 500 MW / 1,000 MWh is a two-hour system built for the evening peak; the duration is what the grid actually buys. If the MWh figure is missing, the story is incomplete.",
  },
  {
    title: "The discovered tariff is the news",
    detail:
      "Tender awards matter through their price: the ₹/MW/month (capacity) or ₹/kWh (energy) discovered in the auction. That number — against the previous round, not against zero — is the trend worth reporting.",
  },
  {
    title: "Awarded ≠ built ≠ despatched",
    detail:
      "A tender award is a contract, commissioning is a milestone, and despatch is a grid fact. The live number on this page only moves at the third stage — which is why it lags the announcement cycle by years.",
  },
];

const sources = [
  {
    name: "CEA — pumped storage",
    cadence: "Reports",
    href: "https://cea.nic.in/hydro-planning-investigation-division/?lang=en",
    detail: "The PSP fleet, pipeline, and hydro planning record.",
  },
  {
    name: "SECI tenders",
    cadence: "Ongoing",
    href: "https://www.seci.co.in/",
    detail: "BESS and storage-linked tender documents and results — the primary record for awards and tariffs.",
  },
  {
    name: "MNRE",
    cadence: "Policy",
    href: "https://mnre.gov.in/",
    detail: "Storage obligations, viability-gap funding schemes, and bidding guidelines.",
  },
  {
    name: "Grid-India reports",
    cadence: "Studies",
    href: "https://posoco.in/",
    detail: "System studies on storage operation, ancillary services, and evening-peak management.",
  },
];

async function StorageWire() {
  const headlines = await getStorageHeadlines(8);
  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Storage newswire</p>
        <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          Google News · last 30 days
        </span>
      </div>
      {headlines.length ? (
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
      ) : (
        <p className="mt-4 text-sm text-slate-400">
          The newswire is unavailable right now. The official sources below remain the primary route.
        </p>
      )}
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Tender headlines usually report the award, not the commissioning — check the three reading
        rules above before treating capacity as operational.
      </p>
    </section>
  );
}

export default function StoragePage() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Storage desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            The six-hour problem.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Solar peaks at 1pm; demand peaks after sunset. Everything on this desk — pumped hydro,
            battery tenders, storage obligations — exists to move energy across that gap. The live
            number below shows how much of the answer is actually on the grid today.
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="urja-panel h-56 animate-pulse" />}>
        <StorageDispatch />
      </Suspense>

      <section>
        <div className="mb-6">
          <p className="urja-kicker">The storage stack</p>
          <h2 className="mt-3 text-3xl font-semibold">Three kinds, three clocks.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {kinds.map((kind, index) => (
            <article key={kind.name} className="urja-panel p-5">
              <p className="font-mono text-xs text-cyan-300/70">0{index + 1}</p>
              <h3 className="mt-4 text-xl font-semibold">{kind.name}</h3>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-cyan-200/70">{kind.label}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{kind.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {tenderRules.map((rule, index) => (
          <article key={rule.title} className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
            <p className="font-mono text-xs text-amber-200/80">0{index + 1}</p>
            <h3 className="mt-3 text-lg font-semibold text-amber-50">{rule.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/75">{rule.detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Suspense fallback={<div className="urja-panel h-72 animate-pulse" />}>
          <StorageWire />
        </Suspense>
        <section className="urja-panel p-5 sm:p-6">
          <p className="urja-kicker">Official sources</p>
          <h2 className="mt-3 text-xl font-semibold">Where the storage record lives</h2>
          <div className="mt-4 divide-y divide-cyan-100/10">
            {sources.map((source) => (
              <a
                key={source.name}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="block py-3 transition hover:bg-cyan-300/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{source.name}</span>
                  <span className="font-mono text-[0.65rem] uppercase text-cyan-300">{source.cadence}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{source.detail}</p>
              </a>
            ))}
          </div>
        </section>
      </div>

      <p className="text-sm text-slate-500">
        Terms on this desk are in the{" "}
        <Link href="/glossary" className="font-semibold text-cyan-300 hover:text-white">
          glossary
        </Link>
        {" "}— see battery energy storage system, pumped storage hydro, and round-the-clock renewable
        power.
      </p>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/">
        ← Back to the live desk
      </Link>
    </div>
  );
}
