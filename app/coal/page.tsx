import Link from "next/link";
import { Suspense } from "react";
import ExplainButton from "@/components/urja/ExplainButton";
import { getCoalStock } from "@/lib/coal";
import { getGridSnapshot } from "@/lib/grid-live";
import coalData from "@/data/coal.json";
import CoalMapLoader from "@/components/coal/CoalMapLoader";
import CoalDirectory from "@/components/coal/CoalDirectory";
import coalPlants from "@/data/coal-plants.json";
import coalMines from "@/data/coal-mines.json";
import coalFields from "@/data/coalfields.json";

const REGION_ORDER = ["East", "Central", "South", "West", "Northeast"] as const;

export const revalidate = 21600;
// Cold-cache renders fetch and parse the CEA PDF; give them room.
export const maxDuration = 60;

export const metadata = {
  title: "Coal Stock",
  description:
    "How much coal India's thermal fleet is sitting on — days of stock, plants at critical levels, and the domestic-vs-imported split — parsed daily from the CEA Fuel Management Division report.",
};

const kt = (value: number) => `${(value / 1000).toFixed(1)} MT`; // '000 t → million tonnes
const daysTone = (days: number) =>
  days >= 15
    ? { text: "text-emerald-300", ring: "border-emerald-300/25 bg-emerald-300/[0.06]", dot: "bg-emerald-400", word: "comfortable" }
    : days >= 8
      ? { text: "text-amber-200", ring: "border-amber-300/25 bg-amber-300/[0.07]", dot: "bg-amber-400", word: "adequate but watch" }
      : { text: "text-rose-300", ring: "border-rose-400/30 bg-rose-400/[0.07]", dot: "bg-rose-400", word: "tight" };

async function CoalDesk() {
  const coal = await getCoalStock();

  if (!coal) {
    return (
      <section className="urja-panel p-6">
        <p className="urja-kicker">National coal stock</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          The CEA daily coal report couldn&apos;t be fetched right now. No estimated figure is shown
          in its place. The official report lives on the{" "}
          <a href="https://npp.gov.in" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-white">National Power Portal</a>.
        </p>
      </section>
    );
  }

  const tone = daysTone(coal.daysOfStock);
  const importPct = (coal.importKt / coal.totalStockKt) * 100;

  const cards = [
    { label: "Total coal stock", value: kt(coal.totalStockKt), sub: `${coal.pctOfNormative}% of the normative level` },
    { label: "Plants at critical stock", value: coal.criticalPlants.toLocaleString("en-IN"), sub: "below 25% of their required stock" },
    { label: "Daily requirement", value: kt(coal.dailyRequirementKt), sub: "at 85% plant load factor" },
    { label: "Imported coal share", value: `${importPct.toFixed(1)}%`, sub: `${kt(coal.importKt)} of the stock is imported` },
  ];

  return (
    <>
      <section className={`rounded-2xl border p-5 sm:p-6 ${tone.ring}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="urja-kicker">National coal stock</p>
          <a
            href={coal.reportUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-slate-300 hover:text-white"
          >
            CEA · as on {coal.asOn} ↗
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-sm text-slate-400">Days of stock the fleet is holding</p>
            <p className={`mt-1 font-mono text-5xl font-semibold tracking-tight sm:text-6xl ${tone.text}`}>
              {coal.daysOfStock.toFixed(1)}
              <span className="ml-2 text-lg font-normal text-slate-400">days</span>
            </p>
          </div>
          <p className={`inline-flex items-center gap-2 font-semibold ${tone.text}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden="true" />
            Supply looks {tone.word}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-400">{c.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-white">{c.value}</p>
              <p className="mt-1 text-xs text-slate-500">{c.sub}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
          &ldquo;Days of stock&rdquo; is total stock ÷ daily requirement across{" "}
          {(coal.capacityMw / 1000).toFixed(0)} GW of monitored coal capacity. Critical = a plant
          holding under a quarter of its normative stock. Figures are the all-India totals from the
          CEA Fuel Management Division&apos;s daily report, parsed from the source PDF.
        </p>
        <div className="mt-3">
          <ExplainButton section="coal-stock" />
        </div>
      </section>
    </>
  );
}

// Coal's live grip on the grid — thermal (overwhelmingly coal) as a share of
// what's being generated this instant. The number the desk keeps implying.
async function CoalLiveGrip() {
  let snap = null;
  try {
    snap = await getGridSnapshot();
  } catch {
    snap = null;
  }
  if (!snap || snap.totalGenerationMw <= 0) return null;
  const thermalMw = snap.mix.thermal;
  const sharePct = (thermalMw / snap.totalGenerationMw) * 100;
  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Coal&apos;s grip on the grid, right now</p>
      <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="text-sm text-slate-400">Power being generated from thermal (overwhelmingly coal)</p>
          <p className="mt-1 font-mono text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            {sharePct.toFixed(0)}
            <span className="ml-2 text-lg font-normal text-slate-400">%</span>
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">In gigawatts</p>
          <p className="mt-1 font-mono text-4xl font-semibold text-amber-200">{(thermalMw / 1000).toFixed(1)}<span className="ml-1 text-base font-normal text-slate-400">GW</span></p>
        </div>
      </div>
      <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-950/60" aria-hidden="true">
        <span className="block h-full rounded-full bg-amber-400/70" style={{ width: `${Math.min(100, sharePct)}%` }} />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        Of the {(snap.totalGenerationMw / 1000).toFixed(0)} GW India is generating this moment, about{" "}
        {(thermalMw / 1000).toFixed(0)} GW is coming from thermal plants. That is why a few days&apos;
        swing in the coal stock above is a national-grid story, not a mining footnote.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Live from the Ministry of Power&apos;s MERIT dashboard, which reports coal and lignite together
        as &ldquo;thermal&rdquo; (gas is counted separately). Instantaneous MW at fetch time.
      </p>
    </section>
  );
}

export default function CoalPage() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Coal &amp; fuel desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            The fuel behind the switch.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Coal still carries most of India&apos;s electricity, and thinning plant stocks are the
            real early warning before load-shedding. This desk reads the CEA&apos;s daily coal report
            — the one that&apos;s usually locked in a PDF — and puts the national picture in plain view.
          </p>
        </div>
      </section>

      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-2xl border border-cyan-100/10 bg-[#05070d]" />}
      >
        <CoalDesk />
      </Suspense>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl border border-cyan-100/10 bg-[#05070d]" />}>
        <CoalLiveGrip />
      </Suspense>

      {/* Production & self-reliance — the supply side */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Where the fuel comes from</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Mined at home a year</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">{(coalData.production.annualProductionMt / 1000).toFixed(2)}<span className="ml-1 text-sm font-normal text-slate-400">bn t</span></p>
            <p className="mt-1 text-xs text-slate-500">{coalData.production.annualProductionMt.toLocaleString("en-IN")} MT · record high</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Dug by Coal India</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">~{coalData.production.coalIndiaSharePct}%</p>
            <p className="mt-1 text-xs text-slate-500">rest from captive &amp; commercial mines</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Reserve rank</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">#{coalData.imports.reserveRank}</p>
            <p className="mt-1 text-xs text-slate-500">largest coal reserves in the world</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{coalData.production.why}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{coalData.production.note}</p>
      </section>

      {/* The import paradox */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Why a coal-rich country still imports</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4">
            <p className="text-xs text-slate-400">Coal imported a year</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-rose-300">~{coalData.imports.annualImportMt}<span className="ml-1 text-sm font-normal text-slate-400">MT</span></p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Of it, coking coal (for steel)</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">~{coalData.imports.cokingCoalImportMt}<span className="ml-1 text-sm font-normal text-slate-400">MT</span></p>
            <p className="mt-1 text-xs text-slate-500">the grade India barely has</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Import bill</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">~${coalData.imports.importBillUsdBn}<span className="ml-1 text-sm font-normal text-slate-400">bn</span></p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{coalData.imports.why}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{coalData.imports.note}</p>
      </section>

      {/* Coal vs the transition — the honest tension */}
      <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-amber-200">Coal vs the transition</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Coal in generation</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-amber-200">~{coalData.transition.coalGenSharePct}%</p>
            <p className="mt-1 text-xs text-slate-500">share slowly falling</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Coal capacity today</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">~{coalData.transition.coalCapacityGw}<span className="ml-1 text-sm font-normal text-slate-400">GW</span></p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">More coal being added</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-rose-300">+{coalData.transition.plannedAddGw}<span className="ml-1 text-sm font-normal text-slate-400">GW</span></p>
            <p className="mt-1 text-xs text-slate-500">this decade</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Non-fossil target</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-emerald-300">{coalData.transition.nonFossilTargetGw}<span className="ml-1 text-sm font-normal text-slate-400">GW</span></p>
            <p className="mt-1 text-xs text-slate-500">by 2030</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-amber-100/85">{coalData.transition.why}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{coalData.transition.note}</p>
        <Link href="/renewables" className="mt-3 inline-block text-sm font-semibold text-cyan-300 hover:text-white">
          See what&apos;s winning the percentage on the renewables desk →
        </Link>
      </section>

      {/* The map — every plant, mapped mines, and the coalfields */}
      <section className="urja-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="urja-kicker">India&apos;s coal map</p>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
            {coalPlants.count} plants · {coalPlants.totalGw} GW
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Every coal power plant we can place, sized by capacity, over the mapped mines and the major
          coalfields. Tap a marker for detail; toggle a layer in the legend.
        </p>
        <div className="mt-4">
          <CoalMapLoader
            plants={coalPlants.plants}
            mines={coalMines.mines}
            fields={coalFields.fields}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Plants: {coalPlants.source} Mines: {coalMines.source} Coalfields: {coalFields.source}
        </p>
      </section>

      {/* Plant directory — the full, searchable list */}
      <section className="urja-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="urja-kicker">Every coal power plant, ranked</p>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
            biggest: {coalPlants.plants[0].name} · {coalPlants.plants[0].mw.toLocaleString("en-IN")} MW
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {coalPlants.count} plants totalling {coalPlants.totalGw} GW — close to India&apos;s whole
          coal fleet. Search for a plant or an owner.
        </p>
        <div className="mt-4">
          <CoalDirectory plants={coalPlants.plants} />
        </div>
      </section>

      {/* Coalfields directory */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">The major coalfields, by region</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{coalFields.note}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {REGION_ORDER.map((region) => {
            const fields = coalFields.fields.filter((f) => f.region === region);
            if (!fields.length) return null;
            return (
              <div key={region} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <p className="font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/70">{region} belt</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {fields.map((f) => (
                    <li key={f.name} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-slate-200">
                        {f.name}
                        <span className="ml-2 text-xs text-slate-500">{f.state}</span>
                      </span>
                      <span className={`shrink-0 font-mono text-[0.65rem] uppercase tracking-wide ${f.type === "Coking coal" ? "text-rose-300/80" : f.type === "Lignite" ? "text-amber-300/80" : f.type === "Tertiary coal" ? "text-sky-300/80" : "text-slate-500"}`}>
                        {f.type}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
          Mines shown on the map are {coalMines.count} community-mapped coal quarries from OpenStreetMap —
          a subset skewed to large surface mines, not a census. Coal India alone runs 300+ mines; many,
          especially underground, aren&apos;t openly geocoded.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Why coal stock is the warning light",
            detail:
              "Coal-fired plants run ~70% of India's generation. A plant runs down its stock in days if railways or mines fall behind, so a widening set of 'critical' plants is the clearest early signal that supply — not capacity — could force cuts.",
          },
          {
            title: "What 'normative' and 'critical' mean",
            detail:
              "The CEA sets a normative stock each plant should hold (often ~17-26 days). A plant under 25% of that is 'critical'; under 10% is 'super-critical'. The count of critical plants matters as much as the national tonnage — a shortage is usually regional first.",
          },
          {
            title: "Domestic vs imported",
            detail:
              "Most stock is domestic coal; a slice is imported, held mainly by plants designed for it and by blending mandates. The import share moves with global coal prices and domestic supply — a rising share often signals a domestic squeeze.",
          },
        ].map((card, index) => (
          <article key={card.title} className="urja-panel p-5">
            <p className="font-mono text-xs text-cyan-300/70">0{index + 1}</p>
            <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.detail}</p>
          </article>
        ))}
      </section>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/grid">
        ← Grid desk
      </Link>
    </div>
  );
}
