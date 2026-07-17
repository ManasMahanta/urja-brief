import { getEnergyHeadlines, getPowerQuotes, officialSources } from "@/lib/power";

function changeClass(change: number) {
  return change >= 0 ? "text-emerald-300" : "text-rose-300";
}

export default async function PowerBoard() {
  const [quotes, headlines] = await Promise.all([getPowerQuotes(), getEnergyHeadlines()]);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Power-market watch</p>
        <h2 className="mt-3 text-xl font-semibold">Listed system proxies</h2>
        <p className="mt-1 text-sm text-slate-300">Market prices are a context signal, not a proxy for the physical grid.</p>
        {quotes.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quotes.map((quote) => <div key={quote.symbol} className="rounded-lg border border-cyan-100/10 bg-slate-950/45 p-3">
            <p className="font-mono text-xs text-cyan-100/60">{quote.symbol}</p>
            <p className="mt-1 text-sm font-medium">{quote.name}</p>
            <p className="mt-3 font-mono text-lg">₹{quote.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
            <p className={`font-mono text-xs ${changeClass(quote.changePercent)}`}>{quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%</p>
          </div>)}
        </div> : <p className="mt-5 text-sm text-slate-400">Live market data is temporarily unavailable. The desk remains source-linked.</p>}
      </section>
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Official reporting desk</p>
        <h2 className="mt-3 text-xl font-semibold">Read the system at its source</h2>
        <div className="mt-4 divide-y divide-cyan-100/10">
          {officialSources.map((source) => <a key={source.name} href={source.href} target="_blank" rel="noreferrer" className="block py-3 transition hover:bg-cyan-300/[0.04]">
            <div className="flex items-center justify-between gap-3"><span className="font-medium">{source.name}</span><span className="font-mono text-[0.65rem] uppercase text-cyan-300">{source.cadence}</span></div>
            <p className="mt-1 text-xs text-slate-400">{source.detail}</p>
          </a>)}
        </div>
      </section>
      <section className="urja-panel p-5 sm:p-6 lg:col-span-2">
        <p className="urja-kicker">India power newswire</p>
        {headlines.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{headlines.map((headline) => <a key={headline.url} href={headline.url} target="_blank" rel="noreferrer" className="rounded-lg border border-cyan-100/10 bg-slate-950/35 p-4 text-sm font-medium leading-snug transition hover:border-cyan-300/40">{headline.title}</a>)}</div> : <p className="mt-4 text-sm text-slate-400">Newswire is unavailable right now. Official reporting links remain above.</p>}
      </section>
    </div>
  );
}
