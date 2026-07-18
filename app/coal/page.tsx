import Link from "next/link";
import { Suspense } from "react";
import ExplainButton from "@/components/urja/ExplainButton";
import { getCoalStock } from "@/lib/coal";

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
