import Link from "next/link";

export const metadata = {
  title: "Methodology",
  description:
    "How Urja Brief handles data: every source the site uses, what each one can and cannot establish, and what happens when a source fails.",
};

const principles = [
  {
    title: "Official reporting is the source of record.",
    detail:
      "Physical-system statements should trace to the responsible authority's dated report, not an unsourced dashboard. Where the desk shows a live number, it names the source and the fetch time next to the number.",
  },
  {
    title: "Market prices are context, not proof.",
    detail:
      "Listed-company quotes can show investor reaction; they cannot establish generation, grid reliability, or policy impact. The desk never presents a share price as a grid condition.",
  },
  {
    title: "Unavailable does not mean zero.",
    detail:
      "When a source fails, is late, or cannot be parsed reliably, the desk says so in place of the number. It never backfills, estimates, or reuses a stale figure without saying that is what it is.",
  },
  {
    title: "Generated text is composed, never authoritative.",
    detail:
      "The AI signal brief and analyst are constrained to the context the desk supplies — live figures and headline text. They are instructed never to invent numbers, causes, or sources, and their output is labelled as interpretation, not record.",
  },
];

// Every data source the site actually uses, and its honest limits.
const sources = [
  {
    name: "MERIT (meritindia.in)",
    what: "Live all-India power position and state-wise demand / own generation / import.",
    cadence: "Fetched every 5–10 min",
    limits:
      "Instantaneous MW with no published timestamp — so the desk stamps its own fetch time. Not daily energy (MU), not peak demand, and not an official CEA record. Labels follow MERIT's own UI.",
  },
  {
    name: "Grid sampler (this site)",
    what: "A 15-minute time series of the MERIT position, powering the load-curve and renewable-share charts.",
    cadence: "Every 15 min, stored per IST day",
    limits:
      "Gaps mean MERIT was unreachable at that time — they are left visible, never interpolated. The observed daily peak is 'highest we sampled', which can miss the true peak between samples.",
  },
  {
    name: "CEA reports (cea.nic.in)",
    what: "The official record: daily generation, installed capacity, coal stocks, demand.",
    cadence: "Daily / monthly documents",
    limits:
      "Published as documents with a reporting lag; the desk links them rather than scraping them. When a claim needs the official number, this is where the desk sends you.",
  },
  {
    name: "Yahoo Finance quotes",
    what: "Listed power-company prices on the homepage market panel.",
    cadence: "~5 min, keyless",
    limits:
      "Delayed and occasionally flaky. Explicitly labelled market context — investor reaction, never a proxy for the physical grid.",
  },
  {
    name: "Google News RSS",
    what: "The power-sector and policy newswires.",
    cadence: "~15 min",
    limits:
      "Headlines are reporting, not verified facts; the AI brief is instructed not to extrapolate beyond a headline's wording. Policy items need confirmation against the issuing authority.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Methodology</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Evidence before energy commentary.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Urja Brief separates three kinds of statement — the official record, live operating
            signals, and interpretation — and labels which one you are reading. This page is the
            full contract.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {principles.map((principle, index) => (
          <article key={principle.title} className="urja-panel p-5">
            <p className="font-mono text-xs text-cyan-300/70">0{index + 1}</p>
            <h2 className="mt-4 text-xl font-semibold">{principle.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{principle.detail}</p>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-6">
          <p className="urja-kicker">The source register</p>
          <h2 className="mt-3 text-3xl font-semibold">
            Every feed the site uses, with its honest limits.
          </h2>
        </div>
        <div className="urja-panel overflow-x-auto p-5 sm:p-6">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="text-left font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
                <th className="pb-3 pr-4 font-medium">Source</th>
                <th className="pb-3 pr-4 font-medium">What it provides</th>
                <th className="pb-3 pr-4 font-medium">Cadence</th>
                <th className="pb-3 font-medium">What it cannot establish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-100/10 align-top">
              {sources.map((source) => (
                <tr key={source.name}>
                  <td className="py-3 pr-4 font-medium text-slate-200">{source.name}</td>
                  <td className="py-3 pr-4 text-slate-400">{source.what}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-cyan-200/80">{source.cadence}</td>
                  <td className="py-3 text-slate-400">{source.limits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-amber-200">Failure behaviour</p>
        <h2 className="mt-3 text-xl font-semibold text-amber-50">
          When a source breaks, the page says so.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-amber-100/80">
          Every fetcher on this site degrades to an explicit &ldquo;unavailable&rdquo; notice rather
          than a cached, estimated, or invented figure. If you see a number, it was fetched at the
          stamped time; if you see a notice, nothing pretended to be a number. Gaps in the sampled
          history stay visible for the same reason.
        </p>
      </section>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/">
        ← Back to the live desk
      </Link>
    </div>
  );
}
