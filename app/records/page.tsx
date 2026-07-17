import Link from "next/link";
import { getRecords, getRecentRollups } from "@/lib/samples";

export const revalidate = 900;

export const metadata = {
  title: "Records",
  description:
    "Observed records from Urja Brief's 15-minute grid sampling: peak demand, highest renewable share, and a day-by-day log — honest about what sampling can miss.",
};

const mw = (value: number) => `${Math.round(value).toLocaleString("en-IN")} MW`;

const istStamp = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function RecordsPage() {
  const [records, rollups] = await Promise.all([getRecords(), getRecentRollups()]);

  const cards = [
    records.peakDemandMw && {
      label: "Highest demand met we've observed",
      value: mw(records.peakDemandMw.value),
      when: istStamp(records.peakDemandMw.t),
    },
    records.maxRePct && {
      label: "Highest renewables' share of generation",
      value: `${records.maxRePct.value.toFixed(1)}%`,
      when: istStamp(records.maxRePct.t),
    },
    records.maxRenewableMw && {
      label: "Most renewable power flowing at once",
      value: mw(records.maxRenewableMw.value),
      when: istStamp(records.maxRenewableMw.t),
    },
    records.maxStorageMw && {
      label: "Most storage despatch at once",
      value: mw(records.maxStorageMw.value),
      when: istStamp(records.maxStorageMw.t),
    },
  ].filter(Boolean) as Array<{ label: string; value: string; when: string }>;

  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Records desk</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            What we&apos;ve seen the grid do.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Records observed by this site&apos;s own 15-minute MERIT sampling
            {records.since ? ` since ${records.since}` : ""}. &ldquo;Observed&rdquo; is the honest
            word: sampling can miss the true extreme between two ticks, and the official record
            belongs to the CEA and Grid-India.
          </p>
        </div>
      </section>

      {cards.length ? (
        <section className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <article key={card.label} className="urja-panel p-5">
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-white">{card.value}</p>
              <p className="mt-2 font-mono text-xs text-cyan-200/70">{card.when} IST</p>
            </article>
          ))}
        </section>
      ) : (
        <section className="urja-panel p-6">
          <p className="text-sm leading-relaxed text-slate-400">
            No records yet — they accumulate once the 15-minute sampler has run. Nothing is
            backfilled or estimated.
          </p>
        </section>
      )}

      <section className="urja-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="urja-kicker">Day by day</p>
          <span className="rounded-full border border-cyan-200/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-cyan-200/75">
            Observed via 15-min sampling
          </span>
        </div>
        {rollups.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="text-left font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Date (IST)</th>
                  <th className="pb-2 pr-3 font-medium">Observed peak</th>
                  <th className="pb-2 pr-3 font-medium">Peak at</th>
                  <th className="pb-2 pr-3 font-medium">Observed min</th>
                  <th className="pb-2 pr-3 font-medium">Max RE share</th>
                  <th className="pb-2 font-medium">Samples</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-100/10 font-mono text-slate-300">
                {rollups.map((day) => (
                  <tr key={day.date}>
                    <td className="py-2 pr-3">{day.date}</td>
                    <td className="py-2 pr-3 text-slate-100">{mw(day.peakMw)}</td>
                    <td className="py-2 pr-3">
                      {new Date(day.peakT).toLocaleTimeString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-3">{mw(day.minMw)}</td>
                    <td className="py-2 pr-3 text-emerald-300">{day.maxRePct.toFixed(1)}%</td>
                    <td className="py-2">{day.samples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            The day-by-day log appears once the sampler has completed at least one day.
          </p>
        )}
        <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
          A day with few samples means the sampler or MERIT was down for part of it — the count is
          shown so a thin day is never mistaken for a quiet one. For official daily peaks, see the
          CEA and Grid-India reports.
        </p>
      </section>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/grid">
        ← Grid desk
      </Link>
    </div>
  );
}
