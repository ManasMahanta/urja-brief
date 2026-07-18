import Link from "next/link";
import { Suspense } from "react";
import RooftopCalculator from "@/components/urja/RooftopCalculator";
import ExplainButton from "@/components/urja/ExplainButton";
import { getEstimatedReSplit } from "@/lib/renewables";
import { getReOutlook, type Strength } from "@/lib/renewables";
import { getSolarYields } from "@/lib/solar";
import capacity from "@/data/re-capacity.json";

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
      <Suspense fallback={<div className="urja-panel h-40 animate-pulse" />}><OutlookSection /></Suspense>
      <Suspense fallback={<div className="urja-panel h-64 animate-pulse" />}><RooftopSection /></Suspense>
      <LeadersSection />

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/carbon">
        ← Carbon desk
      </Link>
    </div>
  );
}
