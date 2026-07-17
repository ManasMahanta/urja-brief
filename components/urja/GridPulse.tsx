import { getGridSnapshot, type FuelMix } from "@/lib/grid-live";
import ExplainButton from "@/components/urja/ExplainButton";

const FUELS: Array<{ key: keyof FuelMix; label: string; bar: string }> = [
  { key: "thermal", label: "Thermal", bar: "bg-amber-400/80" },
  { key: "renewable", label: "Renewable", bar: "bg-emerald-400/80" },
  { key: "hydro", label: "Hydro", bar: "bg-sky-400/80" },
  { key: "nuclear", label: "Nuclear", bar: "bg-violet-400/80" },
  { key: "gas", label: "Gas", bar: "bg-orange-300/80" },
  { key: "other", label: "Other", bar: "bg-slate-400/70" },
];

const mw = (value: number) => `${Math.round(value).toLocaleString("en-IN")} MW`;

const istTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

// The grid's heartbeat: current all-India demand met and the generation mix,
// straight from MERIT. Renders nothing but an honest notice when the fetch
// fails — never a stale or invented number.
export default async function GridPulse() {
  const snapshot = await getGridSnapshot();

  if (!snapshot) {
    return (
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Live grid pulse</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          The MERIT live power position is unavailable right now. No cached or estimated figures
          are shown in its place — official reporting links remain on the desk below.
        </p>
      </section>
    );
  }

  // "Other" bundles MERIT's small storage and other lines for the bar.
  const mix = { ...snapshot.mix, other: snapshot.mix.other + snapshot.mix.storage };

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Live grid pulse</p>
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          <span className="live-dot" /> MERIT · fetched {istTime(snapshot.fetchedAt)} IST
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="text-sm text-slate-400">All-India demand met</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {Math.round(snapshot.demandMetMw).toLocaleString("en-IN")}
            <span className="ml-2 text-lg font-normal text-slate-400">MW</span>
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Renewables&apos; share of generation</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-emerald-300 sm:text-5xl">
            {snapshot.renewableSharePct.toFixed(1)}
            <span className="ml-1 text-lg font-normal text-slate-400">%</span>
          </p>
        </div>
      </div>

      <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-slate-950/60" aria-hidden="true">
        {FUELS.map((fuel) => {
          const share = (mix[fuel.key] / snapshot.totalGenerationMw) * 100;
          if (share <= 0) return null;
          return <span key={fuel.key} className={fuel.bar} style={{ width: `${share}%` }} />;
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {FUELS.map((fuel) =>
          mix[fuel.key] > 0 ? (
            <span key={fuel.key} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`h-2 w-2 rounded-full ${fuel.bar}`} aria-hidden="true" />
              {fuel.label} <span className="font-mono text-slate-300">{mw(mix[fuel.key])}</span>
            </span>
          ) : null,
        )}
      </div>

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Instantaneous readings from the Ministry of Power&apos;s MERIT dashboard at the fetch time
        shown — not daily energy, not peak demand, and not an official CEA record.
      </p>
      <div className="mt-3">
        <ExplainButton section="grid-pulse" />
      </div>
    </section>
  );
}
