import { Suspense } from "react";
import Link from "next/link";
import { getPolicyHeadlines } from "@/lib/power";

export const revalidate = 900;

export const metadata = {
  title: "Policy",
  description:
    "India's power-policy desk: who actually makes the rules, what each authority publishes, and the recent policy newswire — announcements never presented as notified law.",
};

// The bodies that change real constraints, with what they publish and where.
const authorities = [
  {
    name: "Ministry of Power",
    role: "Central policy",
    href: "https://powermin.gov.in/",
    detail:
      "National electricity policy, tariff policy directions, schemes (RDSS, late-payment rules), and directions to central agencies. Announcements here often precede the legal instrument.",
  },
  {
    name: "MNRE",
    role: "Renewables policy",
    href: "https://mnre.gov.in/",
    detail:
      "Renewable targets, bidding guidelines, solar park and rooftop programmes, ALMM lists. Its monthly capacity data is the renewable record of note.",
  },
  {
    name: "CERC",
    role: "Central regulator",
    href: "https://cercind.gov.in/",
    detail:
      "Inter-state tariffs, grid code, DSM rules, market regulation (DAM/RTM/ancillary). A CERC order is binding law in its domain — the document, not the press note, is the fact.",
  },
  {
    name: "CEA",
    role: "Planning & data authority",
    href: "https://cea.nic.in/",
    detail:
      "The statutory data record: daily generation, installed capacity, coal stocks, demand projections, and technical standards. Most physical-system claims should trace here.",
  },
  {
    name: "Grid-India (POSOCO)",
    role: "System operator",
    href: "https://posoco.in/",
    detail:
      "Operates the grid through NLDC/RLDCs. Its operating procedures, reports, and system studies show what the rules do in practice.",
  },
  {
    name: "State ERCs & DISCOMs",
    role: "State layer",
    href: "https://forumofregulators.gov.in/",
    detail:
      "Retail tariffs, open-access surcharges, and RPO enforcement live at the state level — where most policy meets (or misses) implementation.",
  },
];

const readingRules = [
  {
    title: "Proposal ≠ rule",
    detail:
      "Draft amendments, consultation papers, and ministerial statements are signals, not law. The status label — draft, notified, in force — changes the meaning of the same sentence.",
  },
  {
    title: "The instrument beats the press note",
    detail:
      "Press releases summarize and sometimes oversell. When a story matters, the gazette notification or regulator's order is the source; the desk points to the issuing authority, not the headline, wherever it can.",
  },
  {
    title: "Implementation is a separate fact",
    detail:
      "A notified rule with no compliance data is a promise. RPO targets, payment-security rules, and tariff orders all have well-documented gaps between text and practice — claims about effect need evidence of effect.",
  },
];

async function PolicyWire() {
  const headlines = await getPolicyHeadlines(10);
  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Policy newswire</p>
        <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
          Google News · last 14 days
        </span>
      </div>
      <h2 className="mt-3 text-xl font-semibold">Recent reporting to check against the record</h2>
      {headlines.length ? (
        <div className="mt-4 divide-y divide-cyan-100/10">
          {headlines.map((headline) => (
            <a
              key={headline.url}
              href={headline.url}
              target="_blank"
              rel="noreferrer"
              className="block py-3 text-sm font-medium leading-snug text-slate-200 transition hover:text-cyan-200"
            >
              {headline.title}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">
          The newswire is unavailable right now. The authority links below remain the primary route.
        </p>
      )}
      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Headlines are reporting, not legal facts — confirm status against the issuing authority
        before treating a proposal as a rule.
      </p>
    </section>
  );
}

export default function PolicyPage() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Policy desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Rules that change the system.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Power policy matters when it changes a real constraint: what can be built, connected,
            despatched, paid for, or supplied. This desk traces those changes back to the issuing
            authority rather than treating announcements as outcomes.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-6">
          <p className="urja-kicker">Who makes the rules</p>
          <h2 className="mt-3 text-3xl font-semibold">Six authorities cover most of the map.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {authorities.map((authority) => (
            <a
              key={authority.name}
              href={authority.href}
              target="_blank"
              rel="noreferrer"
              className="urja-panel block p-5 transition hover:border-cyan-300/45"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{authority.name}</h3>
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-cyan-300">
                  {authority.role}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{authority.detail}</p>
              <span className="mt-4 inline-block text-xs font-semibold text-cyan-300">
                Open official site →
              </span>
            </a>
          ))}
        </div>
      </section>

      <Suspense fallback={<div className="urja-panel h-72 animate-pulse" />}>
        <PolicyWire />
      </Suspense>

      <section className="grid gap-4 md:grid-cols-3">
        {readingRules.map((rule, index) => (
          <article key={rule.title} className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
            <p className="font-mono text-xs text-amber-200/80">0{index + 1}</p>
            <h3 className="mt-3 text-lg font-semibold text-amber-50">{rule.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/75">{rule.detail}</p>
          </article>
        ))}
      </section>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/">
        ← Back to the live desk
      </Link>
    </div>
  );
}
