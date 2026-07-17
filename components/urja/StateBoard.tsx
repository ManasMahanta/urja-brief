import { getStatewisePower } from "@/lib/grid-live";

const mw = (value: number | null) =>
  value === null ? "—" : Math.round(value).toLocaleString("en-IN");

// State-wise current demand met (MERIT), rendered as a bar list rather than a
// map so every figure stays legible and copyable. Import shown as reported;
// negative import means the state is a net exporter at the moment of fetch.
export default async function StateBoard() {
  const states = await getStatewisePower();

  if (!states.length) {
    return (
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">State-wise demand</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          MERIT&apos;s state-wise feed is unavailable right now. No cached or estimated figures are
          shown in its place.
        </p>
      </section>
    );
  }

  const max = states[0].demandMetMw;

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">State-wise demand met</p>
        <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          MERIT · instantaneous MW
        </span>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-left font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
              <th className="pb-2 pr-3 font-medium">State</th>
              <th className="pb-2 pr-3 font-medium">Demand met</th>
              <th className="pb-2 pr-3 font-medium">Own generation</th>
              <th className="pb-2 pr-3 font-medium">Import</th>
              <th className="pb-2 font-medium" aria-hidden="true" />
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-100/10">
            {states.map((state) => (
              <tr key={state.code}>
                <td className="py-2 pr-3 font-medium text-slate-200">{state.name}</td>
                <td className="py-2 pr-3 font-mono text-slate-100">{mw(state.demandMetMw)}</td>
                <td className="py-2 pr-3 font-mono text-slate-400">{mw(state.ownGenerationMw)}</td>
                <td className="py-2 pr-3 font-mono text-slate-400">{mw(state.importMw)}</td>
                <td className="py-2">
                  <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-slate-950/60">
                    <div
                      className="h-full rounded-full bg-cyan-400/70"
                      style={{ width: `${Math.max(2, (state.demandMetMw / max) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Figures are instantaneous MW at fetch time, as MERIT labels them — Demand Met, Own
        Generation, Import. They are not daily energy and not an official CEA record. A dash means
        MERIT reported no figure.
      </p>
    </section>
  );
}
