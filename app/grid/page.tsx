import { Suspense } from "react";
import Link from "next/link";
import GridPulse from "@/components/urja/GridPulse";
import StateBoard from "@/components/urja/StateBoard";

// ISR: the page (and with it the ~35 uncached MERIT state POSTs) re-renders at
// most every 10 minutes, matching the desk's "instantaneous, as fetched" label.
export const revalidate = 600;

export const metadata = {
  title: "Grid",
  description:
    "Live all-India demand met, the current generation mix, and the state-wise supply picture — every figure marked with its source and fetch time.",
};

export default function GridPage() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Grid desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Demand, balance, and reliability.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            The grid is not a stock ticker. This desk shows the current all-India power position and
            the state-wise supply picture from the Ministry of Power&apos;s MERIT dashboard —
            instantaneous readings, each marked with the time we fetched them.
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="urja-panel h-56 animate-pulse" />}>
        <GridPulse />
      </Suspense>

      <Suspense fallback={<div className="urja-panel h-96 animate-pulse" />}>
        <StateBoard />
      </Suspense>

      <section className="urja-panel p-6">
        <h2 className="text-xl font-semibold">Use the official record</h2>
        <p className="mt-2 text-slate-400">
          MERIT shows the operating moment; the Central Electricity Authority publishes the record.
          For daily generation, peak demand, and energy figures, the CEA reports are the source of
          record.
        </p>
        <a
          className="mt-4 inline-block text-cyan-300 hover:text-white"
          href="https://cea.nic.in/opm_grid_operation/daily-generation-report/?lang=en"
          target="_blank"
          rel="noreferrer"
        >
          Open CEA daily generation report →
        </a>
      </section>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/">
        ← Back to the live desk
      </Link>
    </div>
  );
}
