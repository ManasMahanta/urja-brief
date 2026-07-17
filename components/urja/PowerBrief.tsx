import { getPowerBrief } from "@/lib/power-ai";

export default async function PowerBrief() {
  const brief = await getPowerBrief();
  if (!brief) return null;
  return <section className="urja-panel p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="urja-kicker">AI signal brief</p><span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">Grounded in desk context</span></div><h2 className="mt-3 text-xl font-semibold">What the available signals may mean</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{brief}</p><p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">Generated from the current headlines and market-context cards above. It is not a forecast or an operational reading of the grid.</p></section>;
}
