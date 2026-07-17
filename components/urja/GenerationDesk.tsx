import { getEnergyHeadlines, officialSources } from "@/lib/power";

const generationSources = officialSources.slice(0, 2);

export default async function GenerationDesk() {
  const headlines = await getEnergyHeadlines(5);
  return <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Source of record</p>
      <h2 className="mt-3 text-xl font-semibold">Daily reporting, not inferred generation</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">Urja Brief does not estimate India&apos;s generation mix from company news or market prices. Use the official report for the published period and confirm its reporting date before drawing conclusions.</p>
      <div className="mt-5 space-y-3">{generationSources.map((source) => <a key={source.name} href={source.href} target="_blank" rel="noreferrer" className="block rounded-lg border border-cyan-100/10 bg-slate-950/40 p-4 transition hover:border-cyan-300/45"><div className="flex items-center justify-between gap-3"><span className="font-medium">{source.name}</span><span className="font-mono text-[0.65rem] uppercase tracking-wide text-cyan-300">{source.cadence}</span></div><p className="mt-1 text-xs leading-relaxed text-slate-400">{source.detail}</p><span className="mt-3 inline-block text-xs font-semibold text-cyan-300">Open official report →</span></a>)}</div>
    </section>
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Generation newswire</p>
      <h2 className="mt-3 text-xl font-semibold">Headlines worth checking against the record</h2>
      {headlines.length ? <div className="mt-5 divide-y divide-cyan-100/10">{headlines.map((headline) => <a key={headline.url} href={headline.url} target="_blank" rel="noreferrer" className="block py-3 text-sm font-medium leading-snug text-slate-200 transition hover:text-cyan-200">{headline.title}</a>)}</div> : <p className="mt-5 text-sm text-slate-400">The newswire is temporarily unavailable. The official generation sources remain available above.</p>}
    </section>
  </div>;
}
