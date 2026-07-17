import Link from "next/link";
import { notFound } from "next/navigation";
import { getGridSnapshot, getStateBySlug, getStateList, stateSlug } from "@/lib/grid-live";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const states = await getStateList();
  return states.map((state) => ({ state: stateSlug(state.name) }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const name = state.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${name} — Grid`,
    description: `Current power position for ${name}: demand met, own generation, and import, from the Ministry of Power's MERIT dashboard.`,
  };
}

const mw = (value: number | null) =>
  value === null ? "—" : `${Math.round(value).toLocaleString("en-IN")} MW`;

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params;
  const [result, snapshot] = await Promise.all([getStateBySlug(slug), getGridSnapshot()]);
  if (!result) notFound();
  const { state, power } = result;

  const nationalShare =
    power && snapshot ? (power.demandMetMw / snapshot.demandMetMw) * 100 : null;
  const importShare =
    power && power.importMw !== null && power.demandMetMw > 0
      ? (power.importMw / power.demandMetMw) * 100
      : null;

  return (
    <div className="flex flex-col gap-10 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-14">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">State desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            {state.name}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">
            The current power position as MERIT reports it — instantaneous MW at fetch time, not
            daily energy and not an official CEA record.
          </p>
        </div>
      </section>

      {power ? (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="urja-panel p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-200/70">Demand met</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">{mw(power.demandMetMw)}</p>
            {nationalShare !== null && (
              <p className="mt-2 text-xs text-slate-400">
                {nationalShare.toFixed(1)}% of all-India demand met right now
              </p>
            )}
          </article>
          <article className="urja-panel p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-200/70">Own generation</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">{mw(power.ownGenerationMw)}</p>
            <p className="mt-2 text-xs text-slate-400">Generation MERIT attributes to the state itself</p>
          </article>
          <article className="urja-panel p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-200/70">Import</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">{mw(power.importMw)}</p>
            <p className="mt-2 text-xs text-slate-400">
              {importShare !== null
                ? importShare > 0
                  ? `${importShare.toFixed(0)}% of demand met from beyond the state`
                  : "Net exporter at the moment of fetch"
                : "MERIT reported no figure"}
            </p>
          </article>
        </section>
      ) : (
        <section className="urja-panel p-6">
          <p className="text-sm leading-relaxed text-slate-400">
            MERIT&apos;s feed for {state.name} is unavailable right now. No cached or estimated
            figures are shown in its place.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-amber-200">Reading note</p>
        <p className="mt-3 text-sm leading-relaxed text-amber-100/80">
          A high import share is a market and transmission fact, not a failure: states buy power
          when that is cheaper or cleaner than generating it. Deficit claims need the official
          record — start with the CEA&apos;s daily and monthly reports, not a dashboard snapshot.
        </p>
      </section>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/grid">
        ← All states
      </Link>
    </div>
  );
}
