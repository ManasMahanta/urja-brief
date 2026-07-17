import type { Metadata } from "next";
import Link from "next/link";
import FundSearch from "@/components/fund/FundSearch";

export const metadata: Metadata = {
  title: "AI Fund Dissection — Indian mutual funds",
  description:
    "Dissect any of India's 14,000+ mutual fund schemes: real returns vs Nifty 50, risk, rolling consistency, SIP outcomes, and the Direct-vs-Regular cost drag. Educational only.",
};

// Entry points across categories, not recommendations. Every code and label here
// is verified against AMFI's NAVAll.txt — guessing them from memory produced
// confidently wrong labels (120503 is Axis ELSS, not SBI Small Cap).
const STARTERS: { code: number; name: string; note: string }[] = [
  { code: 122639, name: "Parag Parikh Flexi Cap", note: "Flexi cap · PPFAS" },
  { code: 118955, name: "HDFC Flexi Cap", note: "Flexi cap · HDFC" },
  { code: 125497, name: "SBI Small Cap", note: "Small cap · SBI" },
  { code: 119550, name: "Aditya Birla Banking & PSU Debt", note: "Debt · Aditya Birla" },
];

export default function FundLanding() {
  return (
    <div className="full-bleed -my-8 sm:-my-10">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
        <p className="kicker mb-3">AI Fund Dissection</p>
        <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          Every Indian mutual fund, <span className="text-violet-300">dissected</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-dim">
          Real returns against the Nifty, drawdowns you&apos;d actually have sat through,
          what a monthly SIP would truly have earned, and exactly what the Regular
          plan costs you. Computed from AMFI&apos;s published NAV series — nothing estimated.
        </p>

        <div className="mt-8">
          <FundSearch autoFocus />
        </div>

        <Link
          href="/fund/compare"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-400/50 hover:text-white"
        >
          Compare funds side by side →
        </Link>

        <p className="mt-10 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">Start somewhere</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {STARTERS.map((s) => (
            <Link key={s.code} href={`/fund/${s.code}`} className="glass glass-hover p-4">
              <p className="text-sm font-semibold text-white">{s.name}</p>
              <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-text-mute">{s.note}</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-xs leading-relaxed text-text-mute">
          Educational only, not investment advice. Past performance does not indicate
          future returns. NAV data is published by AMFI at T+1.
        </p>
      </div>
    </div>
  );
}
