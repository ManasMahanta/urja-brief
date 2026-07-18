import Link from "next/link";
import FuelBreakdown from "@/components/urja/FuelBreakdown";
import petro from "@/data/petroleum.json";

export const revalidate = 86400;

const lakhCrore = (crore: number) => (crore / 100000).toFixed(1);

export const metadata = {
  title: "Petroleum & Fuels",
  description:
    "India's transport-fuel picture: where your ₹100 of petrol actually goes (more than half is tax), crude oil and India's ~88% import dependence, the rise-fast-fall-slow reality of pump prices, and LPG cooking-fuel costs.",
};

export default function PetroleumPage() {
  const daysSinceRevision = Math.floor(
    (Date.now() - new Date(petro.lastPriceRevisionDate + "T00:00:00+05:30").getTime()) / 86_400_000,
  );

  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Petroleum &amp; fuels desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            The other half of the tank.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Electricity is one energy story; the fuel in the tank is the other. India buys most of its
            crude from abroad, taxes the pump heavily, and revises prices in ways worth seeing plainly.
            This desk breaks the pump price open and puts the import picture in view.
          </p>
        </div>
      </section>

      {/* #1 — the transparency breakdown */}
      <FuelBreakdown />

      {/* Tax revenue — the aggregate of every litre's tax */}
      <section className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-rose-200">What the tax adds up to</p>
        <p className="mt-3 text-lg leading-relaxed text-slate-200">
          Across every litre sold, petroleum taxes raise roughly{" "}
          <span className="font-mono font-semibold text-rose-200">₹{lakhCrore(petro.taxRevenue.totalCrore)} lakh crore a year</span>{" "}
          — about ₹{lakhCrore(petro.taxRevenue.centralExciseCrore)} lakh crore in central excise and
          ₹{lakhCrore(petro.taxRevenue.stateVatCrore)} lakh crore in state VAT.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-rose-100/70">{petro.taxRevenue.note}</p>
      </section>

      {/* #2 — crude & import dependence */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Crude oil &amp; India&apos;s import dependence</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Indian Basket crude</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">${petro.crude.indianBasketUsdPerBbl}<span className="ml-1 text-sm font-normal text-slate-400">/bbl</span></p>
          </div>
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4">
            <p className="text-xs text-slate-400">Crude that&apos;s imported</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-rose-300">{petro.importDependencePct}%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Annual crude import bill</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">${petro.crudeImportBillUsdBn}<span className="ml-1 text-sm font-normal text-slate-400">bn</span></p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          India imports about {petro.importDependencePct}% of the crude it refines, so the pump price
          and a bill worth tens of billions of dollars ride on global oil and the rupee. {petro.crude.note}
        </p>
      </section>

      {/* Ethanol blending — the import-cutting policy story */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Ethanol blending (E20)</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4">
            <p className="text-xs text-slate-400">Ethanol in petrol</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-emerald-300">{petro.ethanol.blendPct}%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Forex saved (cumulative)</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">₹{lakhCrore(petro.ethanol.forexSavedCrore)}<span className="ml-1 text-sm font-normal text-slate-400">lakh cr</span></p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Crude substituted</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">{petro.ethanol.crudeSubstitutedLakhTonnes}<span className="ml-1 text-sm font-normal text-slate-400">lakh t</span></p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          {petro.ethanol.why} {petro.ethanol.targetNote}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{petro.ethanol.mileageNote}</p>
      </section>

      {/* #4 — prices frozen watch + rise fast, fall slow */}
      <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-amber-200">Rise fast, fall slow</p>
        <p className="mt-3 text-lg leading-relaxed text-slate-200">
          It&apos;s been{" "}
          <span className="font-mono font-semibold text-amber-200">{daysSinceRevision.toLocaleString("en-IN")} days</span>{" "}
          since the last nationwide pump-price revision ({new Date(petro.lastPriceRevisionDate + "T00:00:00+05:30").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}),
          while crude has swung the whole time.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-amber-100/80">{petro.lastPriceRevisionNote} {petro.priceMechanism}</p>
      </section>

      {/* #4 — LPG */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">LPG &amp; cooking fuel</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Domestic cylinder ({petro.lpg.cylinderKg} kg)</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">₹{petro.lpg.domesticCylinderInr}</p>
          </div>
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4">
            <p className="text-xs text-slate-400">Ujjwala (PMUY) subsidy</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-emerald-300">₹{petro.lpg.ujjwalaSubsidyInr}<span className="ml-1 text-sm font-normal text-slate-400">/cyl</span></p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Net for PMUY households</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">₹{petro.lpg.domesticCylinderInr - petro.lpg.ujjwalaSubsidyInr}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{petro.lpg.note}</p>
      </section>

      <p className="urja-panel p-5 text-xs leading-relaxed text-slate-500">
        The pump-price build-up is computed from reference pump prices and current tax rates. Crude,
        import, and LPG figures are approximate and dated ({petro.asOf}) — {petro.source}. There is no
        clean free live feed for these, so they are shown as reference, not real-time.
      </p>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/ev">
        ← EV desk (petrol vs electric running cost)
      </Link>
    </div>
  );
}
