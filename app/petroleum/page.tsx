import Link from "next/link";
import FuelBreakdown from "@/components/urja/FuelBreakdown";
import FuelBill from "@/components/urja/FuelBill";
import InfraMapLoader from "@/components/urja/InfraMapLoader";
import PlainEnglish from "@/components/urja/PlainEnglish";
import CoalDirectory from "@/components/coal/CoalDirectory";
import petro from "@/data/petroleum.json";
import oilGas from "@/data/oil-gas.json";
import { getPpacFuelPrices, getPpacCrude, getPpacCrudeBalance } from "@/lib/ppac";

export const revalidate = 43200;
export const maxDuration = 30;

const lakhCrore = (crore: number) => (crore / 100000).toFixed(1);

const refineriesByCap = [...oilGas.refineries].sort((a, b) => b.mmtpa - a.mmtpa);
const totalRefiningMmtpa = Math.round(oilGas.refineries.reduce((s, r) => s + r.mmtpa, 0));

function OilGasSection() {
  const refineryLayer = {
    id: "refineries",
    label: `Refineries (${oilGas.refineries.length})`,
    color: "#f59e0b",
    sizeByMw: true,
    sizeMax: 35,
    unit: "MMTPA",
    points: oilGas.refineries.map((r) => ({ name: r.name, lat: r.lat, lng: r.lng, mw: r.mmtpa, sub: `${r.operator} refinery` })),
  };
  const lngLayer = {
    id: "lng",
    label: `LNG terminals (${oilGas.lngTerminals.length})`,
    color: "#22d3ee",
    sizeByMw: true,
    sizeMax: 18,
    unit: "MMTPA",
    points: oilGas.lngTerminals.map((t) => ({ name: t.name, lat: t.lat, lng: t.lng, mw: t.mmtpa, sub: `${t.operator} · LNG import terminal` })),
  };
  const fieldLayer = {
    id: "fields",
    label: `Producing fields (${oilGas.fields.length})`,
    color: "#a3e635",
    ring: true,
    points: oilGas.fields.map((f) => ({ name: f.name, lat: f.lat, lng: f.lng, sub: `${f.kind} · ${f.operator}` })),
  };

  const dirRows = refineriesByCap.map((r) => ({ name: r.name, mw: r.mmtpa, owner: r.operator }));

  return (
    <>
      <section className="urja-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="urja-kicker">India&apos;s oil &amp; gas map</p>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
            {oilGas.refineries.length} refineries · ~{totalRefiningMmtpa} MMTPA
          </p>
        </div>
        <PlainEnglish>
          Where India actually turns crude oil into petrol and diesel (refineries), where imported
          gas arrives by ship (LNG terminals), and the few places India digs up its own oil.
        </PlainEnglish>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          The physical petroleum system: refineries sized by capacity, the LNG import terminals where
          gas lands, and the domestic fields the ~12% home-grown crude comes from. Tap a marker;
          toggle a layer in the legend.
        </p>
        <div className="mt-4">
          <InfraMapLoader layers={[refineryLayer, lngLayer, fieldLayer]} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">{oilGas.source}</p>
      </section>

      <section className="urja-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="urja-kicker">Every refinery, ranked</p>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
            biggest: {refineriesByCap[0].name} · {refineriesByCap[0].mmtpa} MMTPA
          </p>
        </div>
        <PlainEnglish>
          Every plant that turns crude oil into fuel, ranked by size. &ldquo;MMTPA&rdquo; just means how
          many million tonnes of crude it can process in a year — bigger number, bigger refinery.
        </PlainEnglish>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{oilGas.refineriesNote}</p>
        <div className="mt-4">
          <CoalDirectory plants={dirRows} noun="refineries" unit="MMTPA" placeholder="Search a refinery or operator — e.g. Jamnagar, IOCL, Paradip" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <p className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-xs leading-relaxed text-slate-400">
            <span className="font-mono text-[0.6rem] uppercase tracking-wide text-cyan-200/70">LNG terminals</span><br />
            {oilGas.lngNote}
          </p>
          <p className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-xs leading-relaxed text-slate-400">
            <span className="font-mono text-[0.6rem] uppercase tracking-wide text-lime-300/70">Producing fields</span><br />
            {oilGas.fieldsNote}
          </p>
        </div>
      </section>
    </>
  );
}

export const metadata = {
  title: "Petroleum & Fuels",
  description:
    "India's transport-fuel picture: where your ₹100 of petrol actually goes (more than half is tax), crude oil and India's ~88% import dependence, the rise-fast-fall-slow reality of pump prices, and LPG cooking-fuel costs.",
};

export default async function PetroleumPage() {
  const daysSinceRevision = Math.floor(
    (Date.now() - new Date(petro.lastPriceRevisionDate + "T00:00:00+05:30").getTime()) / 86_400_000,
  );
  const [ppac, crude, balance] = await Promise.all([
    getPpacFuelPrices(),
    getPpacCrude(),
    getPpacCrudeBalance(),
  ]);
  const live = ppac ? { postedOn: ppac.postedOn, metros: ppac.metros } : undefined;
  const crudeUsd = crude?.usdPerBbl ?? petro.crude.indianBasketUsdPerBbl;
  const importPct = balance?.importDependencePct ?? petro.importDependencePct;
  const importBill = balance?.importBillUsdBn ?? petro.crudeImportBillUsdBn;
  const balanceFy = balance ? balance.fy.replace("-", "–") : null;

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

      {/* Live official metro prices from PPAC */}
      {ppac && (
        <section className="urja-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="urja-kicker">Official pump prices today</p>
            <a
              href={ppac.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-emerald-300 hover:text-white"
            >
              PPAC · as on {ppac.postedOn} ↗
            </a>
          </div>
          <PlainEnglish>
            What a litre of petrol and diesel actually costs at the pump today in India&apos;s four big
            cities, taken straight from the government&apos;s official price sheet.
          </PlainEnglish>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(ppac.metros) as Array<keyof typeof ppac.metros>).map((city) => (
              <div key={city} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-400">{city}</p>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className="font-mono text-[0.6rem] uppercase tracking-wide text-amber-200/70">Petrol</p>
                    <p className="font-mono text-2xl font-semibold text-white">₹{ppac.metros[city].petrol.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[0.6rem] uppercase tracking-wide text-cyan-200/70">Diesel</p>
                    <p className="font-mono text-2xl font-semibold text-white">₹{ppac.metros[city].diesel.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
            Retail selling price per litre, parsed live from the Petroleum Planning &amp; Analysis
            Cell&apos;s daily metro price sheet — the government&apos;s own source. PPAC publishes the four
            metros; the calculators below use these live where they overlap and reference prices for
            other cities.
          </p>
        </section>
      )}

      {/* #1 — the transparency breakdown */}
      <FuelBreakdown live={live} />

      {/* Personal bill + cheapest→costliest state ranking */}
      <FuelBill live={live} />

      {/* Tax revenue — the aggregate of every litre's tax */}
      <section className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-rose-200">What the tax adds up to</p>
        <PlainEnglish>
          Add up the tax on every litre sold across the country and this is how much money the
          government collects from fuel each year — one of its biggest single sources of income.
        </PlainEnglish>
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
        <PlainEnglish>
          India barely produces any oil of its own, so it buys almost all of it from other countries.
          This is what that crude costs, how much of it is imported, and the yearly bill for buying it.
        </PlainEnglish>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400">Indian Basket crude</p>
              {crude ? (
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wide text-emerald-300">
                  PPAC · {crude.month.slice(0, 3)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">${crudeUsd}<span className="ml-1 text-sm font-normal text-slate-400">/bbl</span></p>
            {crude && crude.series.length > 1 ? (
              <div className="mt-2 flex items-end gap-1.5 text-[0.6rem] text-slate-500">
                {crude.series.slice(-6).map((p) => (
                  <span key={p.month} className="flex flex-col items-center">
                    <span className="font-mono text-slate-300">{p.usdPerBbl}</span>
                    <span>{p.month.slice(0, 3)}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400">Crude that&apos;s imported</p>
              {balance ? (
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wide text-emerald-300">
                  PPAC · {balanceFy}
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-3xl font-semibold text-rose-300">{importPct}%</p>
            {balance ? (
              <p className="mt-1 text-xs text-slate-500">{balance.indigenousMmt} of {balance.processedMmt} MMT is home-grown</p>
            ) : null}
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400">Annual crude import bill</p>
              {balance ? (
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wide text-emerald-300">
                  PPAC · {balanceFy}
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">${importBill}<span className="ml-1 text-sm font-normal text-slate-400">bn</span></p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          India imports about {importPct}% of the crude it refines, so the pump price
          and a bill worth tens of billions of dollars ride on global oil and the rupee.{" "}
          {crude
            ? `The Indian Basket is the crude mix India actually buys (sour Oman/Dubai + Brent); PPAC prices it, and $${crude.usdPerBbl}/bbl is its ${crude.month} ${crude.fy.split("-")[0]} monthly average.`
            : petro.crude.note}
        </p>
      </section>

      {/* Import-source mix — the Russia story */}
      <section className="urja-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="urja-kicker">Who India buys crude from</p>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
            Russia was {petro.importSources.russiaPreWarPct}% before 2022
          </p>
        </div>
        <PlainEnglish>
          Which countries India&apos;s oil comes from. The big shift: since 2022 India buys most of its
          oil from Russia at a discount, when earlier it barely bought any.
        </PlainEnglish>
        <div className="mt-4 flex flex-col gap-2">
          {petro.importSources.sources.map((s) => (
            <div key={s.country} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 truncate text-slate-300">{s.country}</span>
              <span className="relative h-5 flex-1 overflow-hidden rounded bg-slate-950/60">
                <span
                  className={`absolute inset-y-0 left-0 rounded ${s.accent === "rose" ? "bg-rose-400/70" : "bg-cyan-400/50"}`}
                  style={{ width: `${s.sharePct}%` }}
                />
              </span>
              <span className={`w-12 shrink-0 text-right font-mono ${s.accent === "rose" ? "text-rose-300" : "text-slate-100"}`}>
                {s.sharePct}%
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          {petro.importSources.why} At roughly ${petro.importSources.discountUsdPerBbl}/barrel below the
          market, discounted Russian crude reshaped India&apos;s oil map.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{petro.importSources.note}</p>
      </section>

      {/* India the refiner & exporter — the untold half */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">India imports crude, exports fuel</p>
        <PlainEnglish>
          India buys raw crude oil, refines it into petrol and diesel at huge scale, and then sells a
          lot of that finished fuel to other countries — refining is one of India&apos;s big earners.
        </PlainEnglish>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Refining capacity</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">{petro.refining.capacityMmtpa}<span className="ml-1 text-sm font-normal text-slate-400">MMT/yr</span></p>
            <p className="mt-1 text-xs text-slate-500">≈ {petro.refining.capacityMbpd} million barrels/day</p>
          </div>
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4">
            <p className="text-xs text-slate-400">Refined-product exports</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-emerald-300">${petro.refining.refinedExportUsdBn}<span className="ml-1 text-sm font-normal text-slate-400">bn/yr</span></p>
            <p className="mt-1 text-xs text-slate-500">a top single export line</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Jamnagar (Reliance)</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">{petro.refining.jamnagarMbpd}<span className="ml-1 text-sm font-normal text-slate-400">mbpd</span></p>
            <p className="mt-1 text-xs text-slate-500">world&apos;s largest single site</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{petro.refining.why}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{petro.refining.note}</p>
      </section>

      {/* Oil & gas infrastructure map + refinery directory */}
      <OilGasSection />

      {/* Strategic reserve — days of cover */}
      <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">If imports stopped tomorrow</p>
        <PlainEnglish>
          India keeps an emergency oil stockpile in case supplies from abroad ever get cut off. This
          is roughly how many days the country could keep going on the oil it has stored.
        </PlainEnglish>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Strategic reserve</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">{petro.strategicReserve.strategicDays}<span className="ml-1 text-sm font-normal text-slate-400">days</span></p>
            <p className="mt-1 text-xs text-slate-500">{petro.strategicReserve.strategicMmt} MMT in caverns</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Total cover with commercial stock</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">≈{petro.strategicReserve.totalCoverDays}<span className="ml-1 text-sm font-normal text-slate-400">days</span></p>
            <p className="mt-1 text-xs text-slate-500">crude + refined products held</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">Crude that&apos;s imported</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-rose-300">{petro.importDependencePct}%</p>
            <p className="mt-1 text-xs text-slate-500">why the buffer matters</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-cyan-100/80">{petro.strategicReserve.why}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Caverns at {petro.strategicReserve.sites}. {petro.strategicReserve.note}
        </p>
      </section>

      {/* Ethanol blending — the import-cutting policy story */}
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Ethanol blending (E20)</p>
        <PlainEnglish>
          India mixes ethanol (alcohol made from sugarcane and grain) into petrol. Every litre of
          ethanol is a litre of crude India doesn&apos;t have to import — E20 means a 20% mix.
        </PlainEnglish>
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
        <PlainEnglish>
          Pump prices tend to jump quickly when global oil gets dearer but come down only slowly when
          it gets cheaper. This shows how long it&apos;s been since prices actually changed.
        </PlainEnglish>
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
        <PlainEnglish>
          What a household cooking-gas cylinder costs, and how much poorer families get back as a
          government subsidy under the Ujjwala scheme.
        </PlainEnglish>
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
