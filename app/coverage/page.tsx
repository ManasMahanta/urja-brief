import type { Metadata } from "next";
import { Suspense } from "react";
import { coverageLastReviewed, coveredStocks } from "@/lib/stocks-data";
import { getStockQuote, formatChange, formatPrice, type Quote } from "@/lib/market";
import Disclaimer from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "Coverage",
  description:
    "The Indian stocks Bazaar Brief tracks most, in one table — sector, size, a neutral what-to-watch note, and a live price. Editorial coverage, not investment advice.",
};

// Live price column. Isolated in its own async component + Suspense so the
// table renders instantly and prices stream in (and never block the page).
async function CoverageRows() {
  const quotes = await Promise.all(
    coveredStocks.map((s) =>
      getStockQuote(s.symbol).catch(() => null as Quote | null),
    ),
  );
  return (
    <>
      {coveredStocks.map((s, i) => {
        const q = quotes[i];
        const up = q ? q.changePercent >= 0 : false;
        return (
          <tr key={s.symbol}>
            <td className="px-4 py-3">
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.symbol}</p>
            </td>
            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.sector}</td>
            <td className="px-4 py-3">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-400">
                {s.marketCap} cap
              </span>
            </td>
            <td className="px-4 py-3 tabular-nums">
              {q ? (
                <>
                  <p>{formatPrice(q.price, q.currency)}</p>
                  <p
                    className={`text-xs ${
                      up
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatChange(q.changePercent)}
                  </p>
                </>
              ) : (
                <span className="text-zinc-400">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.thesis}</td>
          </tr>
        );
      })}
    </>
  );
}

function RowSkeleton() {
  return (
    <>
      {coveredStocks.map((s) => (
        <tr key={s.symbol}>
          <td className="px-4 py-3">
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.symbol}</p>
          </td>
          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.sector}</td>
          <td className="px-4 py-3">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-400">
              {s.marketCap} cap
            </span>
          </td>
          <td className="px-4 py-3 text-zinc-400">…</td>
          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.thesis}</td>
        </tr>
      ))}
    </>
  );
}

export default function CoveragePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="pt-6">
        <h1 className="text-4xl font-bold tracking-tight">Coverage</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          The stocks {`Bazaar Brief`} writes about most, in one table — with a
          neutral note on what actually moves each one, and a live price.
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Editorial coverage, last reviewed {coverageLastReviewed}. The
          &ldquo;what to watch&rdquo; notes are context, <strong>not</strong> buy
          or sell recommendations.
        </p>
      </section>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white/65 dark:border-white/10 dark:bg-white/[0.035]">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left dark:border-white/10">
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Sector</th>
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Live price</th>
              <th className="px-4 py-3 font-semibold">What to watch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <Suspense fallback={<RowSkeleton />}>
              <CoverageRows />
            </Suspense>
          </tbody>
        </table>
      </div>

      <Disclaimer compact />
    </div>
  );
}
