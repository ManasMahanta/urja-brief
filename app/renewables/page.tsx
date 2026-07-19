import Link from "next/link";
import { Suspense } from "react";
import RooftopCalculator from "@/components/urja/RooftopCalculator";
import DuckCurve from "@/components/urja/DuckCurve";
import ExplainButton from "@/components/urja/ExplainButton";
import { getEstimatedReSplit } from "@/lib/renewables";
import { getReOutlook, type Strength } from "@/lib/renewables";
import { getSolarYields } from "@/lib/solar";
import capacity from "@/data/re-capacity.json";
import InfraMapLoader from "@/components/urja/InfraMapLoader";
import CoalDirectory from "@/components/coal/CoalDirectory";
import solarParks from "@/data/solar-parks.json";
import windFarms from "@/data/wind-farms.json";

export const revalidate = 3600;
export const maxDuration = 30;

export const metadata = {
  title: "Solar & Wind",
  description:
    "India's solar and wind picture: an estimated live solar-vs-wind split, a solar & wind forecast outlook, a rooftop-solar savings calculator using your city's real sunlight, and the state capacity leaders.",
};

const mw = (v: number) => `${Math.round(v).toLocaleString("en-IN")} MW`;
const gw = (v: number) => `${(v / 1000).toFixed(1)} GW`;

const STRENGTH: Record<Strength, { text: string; label: string }> = {
  strong: { text: "text-emerald-300", label: "Strong" },
  moderate: { text: "text-amber-200", label: "Moderate" },
  weak: { text: "text-slate-400", label: "Weak" },
};

async function SplitSection() {
  const split = await getEstimatedReSplit();
  if (!split) return null;
  const solarPct = split.solarSharePct;
  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Estimated solar vs wind — right now</p>
      <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-3">
        <div>
          <p className="text-sm text-slate-400">Solar (estimated)</p>
          <p className="mt-1 font-mono text-4xl font-semibold text-amber-300">{mw(split.solarMw)}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Wind &amp; other RE</p>
          <p className="mt-1 font-mono text-4xl font-semibold text-sky-300">{mw(split.windOtherMw)}</p>
        </div>
      </div>
      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-950/60" aria-hidden="true">
        <span className="bg-amber-400/80" style={{ width: `${solarPct}%` }} />
        <span className="bg-sky-400/80" style={{ width: `${100 - solarPct}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Solar is about {solarPct.toFixed(0)}% of the {mw(split.renewableMw)} of renewables flowing now.
      </p>
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        MERIT reports renewables as one figure. We infer the solar share from the daily shape — solar
        is zero after dark, so the night-time floor of the renewable curve is essentially wind. Treat
        this as an estimate, not a metered split.
      </p>
      <div className="mt-3">
        <ExplainButton section="renewables-split" />
      </div>
    </section>
  );
}

async function OutlookSection() {
  const outlook = await getReOutlook();
  if (!outlook?.length) return null;
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Solar &amp; wind outlook</p>
      <p className="mt-2 text-sm text-slate-400">How strong the sun and wind — what actually drives renewable output — will be over the coming days.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {outlook.map((d) => (
          <div key={d.date} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">
              {d.date === todayIso ? "Today" : new Date(d.date + "T00:00:00+05:30").toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })}
            </p>
            <p className="mt-2 text-sm"><span aria-hidden="true">☀</span> Solar <span className={`font-semibold ${STRENGTH[d.solar].text}`}>{STRENGTH[d.solar].label}</span></p>
            <p className="mt-1 text-sm"><span aria-hidden="true">🌬</span> Wind <span className={`font-semibold ${STRENGTH[d.wind].text}`}>{STRENGTH[d.wind].label}</span></p>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Sun and wind strength from the open-meteo forecast across solar and wind belts — a guide to
        renewable output, not a generation forecast.
      </p>
    </section>
  );
}

async function RooftopSection() {
  const yields = await getSolarYields();
  if (!yields.length) return null;
  return <RooftopCalculator yields={yields} />;
}

function LeadersSection() {
  const topSolar = [...capacity.states].sort((a, b) => b.solar - a.solar).slice(0, 6);
  const topWind = [...capacity.states].filter((s) => s.wind > 0).sort((a, b) => b.wind - a.wind).slice(0, 6);
  const Table = ({ title, rows, col, color }: { title: string; rows: typeof topSolar; col: "solar" | "wind"; color: string }) => (
    <div>
      <p className={`font-mono text-xs uppercase tracking-wide ${color}`}>{title}</p>
      <table className="mt-3 w-full text-sm">
        <tbody className="divide-y divide-cyan-100/10">
          {rows.map((r) => (
            <tr key={r.state}>
              <td className="py-1.5 pr-3 text-slate-300">{r.state}</td>
              <td className="py-1.5 text-right font-mono text-slate-100">{gw(r[col])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Who&apos;s building the transition</p>
      <p className="mt-2 text-sm text-slate-400">
        National installed capacity: {gw(capacity.nationalMw.solar)} solar, {gw(capacity.nationalMw.wind)} wind.
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <Table title="Top solar states" rows={topSolar} col="solar" color="text-amber-300/80" />
        <Table title="Top wind states" rows={topWind} col="wind" color="text-sky-300/80" />
      </div>
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        {capacity.source}, approximate, as of {capacity.asOf}. Capacity is added every month.
      </p>
    </section>
  );
}

function TargetTracker() {
  const n = capacity.nationalMw;
  const nonFossilGw = (n.solar + n.wind + n.largeHydro + n.bioPower + n.smallHydro + n.nuclear) / 1000;
  const target = capacity.nonFossilTargetGw2030;
  const pct = (nonFossilGw / target) * 100;
  const yearsLeft = Math.max(1, 2030 - new Date().getFullYear());
  const pace = (target - nonFossilGw) / yearsLeft;
  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">500 GW by 2030 — the non-fossil target</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        India&apos;s headline climate commitment: 500 GW of non-fossil power capacity (renewables +
        hydro + nuclear) by 2030.
      </p>
      <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-slate-950/60" aria-hidden="true">
        <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400/80 to-cyan-400/80" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">Non-fossil capacity now</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-white">{nonFossilGw.toFixed(0)}<span className="ml-1 text-sm font-normal text-slate-400">GW ({pct.toFixed(0)}%)</span></p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">2030 target</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-cyan-200">{target}<span className="ml-1 text-sm font-normal text-slate-400">GW</span></p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">Pace needed</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-200">{pace.toFixed(0)}<span className="ml-1 text-sm font-normal text-slate-400">GW/yr</span></p>
        </div>
      </div>
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Capacity from MNRE ({capacity.asOf}), approximate. Solar has been the engine — India has been
        adding renewables at a record pace, which is what keeps this target in reach.
      </p>
    </section>
  );
}

async function YieldRanking() {
  const yields = await getSolarYields();
  if (!yields.length) return null;
  const ranked = [...yields].sort((a, b) => b.yieldKwhPerKwYear - a.yieldKwhPerKwYear);
  const top = ranked[0].yieldKwhPerKwYear;
  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Where rooftop solar pays back fastest</p>
      <p className="mt-2 text-sm text-slate-400">Cities ranked by how many units a kilowatt of panels makes in a year (measured radiation).</p>
      <div className="mt-4 space-y-1.5">
        {ranked.map((c, i) => (
          <div key={c.name} className="flex items-center gap-3">
            <span className="w-6 shrink-0 text-right font-mono text-xs text-slate-500">{i + 1}</span>
            <span className="w-28 shrink-0 text-sm text-slate-300">{c.name}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-950/60">
              <span className="absolute inset-y-0 left-0 rounded-md bg-amber-400/25" style={{ width: `${(c.yieldKwhPerKwYear / top) * 100}%` }} aria-hidden="true" />
              <span className="absolute inset-y-0 left-2.5 flex items-center font-mono text-xs text-slate-100">{c.yieldKwhPerKwYear.toLocaleString("en-IN")} kWh/kW/yr</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CapacityReality() {
  const n = capacity.nationalMw;
  const cf = capacity.capacityFactorPct;
  const rows = [
    { name: "Solar", installed: n.solar, cf: cf.solar, color: "text-amber-300" },
    { name: "Wind", installed: n.wind, cf: cf.wind, color: "text-sky-300" },
  ];
  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Capacity vs reality</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Installed capacity isn&apos;t constant output. The sun sets and the wind drops, so a fleet
        averages only a fraction of its nameplate — its capacity factor.
      </p>
      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex items-baseline justify-between text-sm">
              <span className={`font-semibold ${r.color}`}>{r.name}</span>
              <span className="font-mono text-slate-300">{gw(r.installed)} installed · ~{r.cf}% capacity factor · ~{gw(r.installed * r.cf / 100)} average</span>
            </div>
            <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-950/60" aria-hidden="true">
              <span className={`block h-full rounded-full ${r.name === "Solar" ? "bg-amber-400/70" : "bg-sky-400/70"}`} style={{ width: `${r.cf}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        So {gw(n.solar)} of solar averages nearer {gw(n.solar * cf.solar / 100)} of actual power. Capacity factors are
        typical Indian values; the instantaneous figure is higher at noon (solar) and in the monsoon (wind).
      </p>
    </section>
  );
}

const solarDirRows = solarParks.parks.map((p) => ({
  name: p.name ?? "Unnamed solar park",
  mw: p.mw,
  owner: p.operator,
}));

function InstallationsSection() {
  const solarLayer = {
    id: "solar",
    label: `Solar parks (${solarParks.count})`,
    color: "#f59e0b",
    sizeByMw: true,
    points: solarParks.parks.map((p) => ({
      name: p.name ?? "Unnamed solar park",
      lat: p.lat,
      lng: p.lng,
      mw: p.mw,
      sub: p.operator ?? "Solar park",
    })),
  };
  const windLayer = {
    id: "wind",
    label: `Wind farms (${windFarms.count})`,
    color: "#38bdf8",
    sizeByMw: true,
    points: windFarms.farms.map((f) => ({ name: f.name, lat: f.lat, lng: f.lng, mw: f.mw, sub: "Wind farm" })),
  };

  return (
    <>
      <section className="urja-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="urja-kicker">Where the parks actually are</p>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
            {solarParks.count} solar parks · {solarParks.totalGw} GW mapped
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Every utility-scale solar park we can place, sized by capacity, with the handful of wind
          farms that are mapped as farms. Tap a marker for detail; toggle a layer in the legend.
        </p>
        <div className="mt-4">
          <InfraMapLoader layers={[solarLayer, windLayer]} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Solar: {solarParks.source} Wind: {windFarms.source}
        </p>
      </section>

      <section className="urja-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="urja-kicker">India&apos;s biggest solar parks, ranked</p>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
            biggest: {solarParks.parks[0].name} · {solarParks.parks[0].mw.toLocaleString("en-IN")} MW
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {solarParks.count} mapped parks totalling {solarParks.totalGw} GW. That is far short of
          India&apos;s ~{Math.round(capacity.nationalMw.solar / 1000)} GW of solar — most of the rest is
          rooftop and smaller plants that aren&apos;t individually mapped. Search a park or operator.
        </p>
        <div className="mt-4">
          <CoalDirectory
            plants={solarDirRows}
            noun="parks"
            placeholder="Search a solar park or operator — e.g. Khavda, Pavagada, NTPC"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-sky-200">Why wind isn&apos;t a map</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">
          India has about {(capacity.nationalMw.wind / 1000).toFixed(0)} GW of wind, but almost none of it
          maps as tidy &ldquo;farms&rdquo;: open data records wind as tens of thousands of individual
          turbines strung along ridgelines and coasts, not as named parks. Only a couple — led by{" "}
          <span className="font-semibold text-sky-200">Muppandal</span> in Tamil Nadu, one of Asia&apos;s
          largest wind clusters — are mapped as a single farm.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          So the honest way to see India&apos;s wind is by state, not by dot — Gujarat, Tamil Nadu,
          Karnataka, Rajasthan and Maharashtra hold most of it. That ranking is in{" "}
          <span className="text-slate-200">Who&apos;s building the transition</span> above.
        </p>
      </section>
    </>
  );
}

export default function RenewablesPage() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Solar &amp; wind desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Sun, wind, and your roof.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Solar floods the grid at midday; wind carries the night and the monsoon. This desk splits
            the two, forecasts them, ranks the states building fastest — and works out what rooftop
            solar would generate and save at your own address.
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="urja-panel h-40 animate-pulse" />}><SplitSection /></Suspense>
      <div id="duck" className="scroll-mt-24">
        <Suspense fallback={<div className="urja-panel h-64 animate-pulse" />}><DuckCurve /></Suspense>
      </div>
      <Suspense fallback={<div className="urja-panel h-40 animate-pulse" />}><OutlookSection /></Suspense>
      <Suspense fallback={<div className="urja-panel h-64 animate-pulse" />}><RooftopSection /></Suspense>
      <Suspense fallback={<div className="urja-panel h-40 animate-pulse" />}><YieldRanking /></Suspense>
      <TargetTracker />
      <LeadersSection />
      <InstallationsSection />
      <CapacityReality />

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/carbon">
        ← Carbon desk
      </Link>
    </div>
  );
}
