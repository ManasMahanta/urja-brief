import Link from "next/link";
import { Suspense } from "react";
import { getLiveSources, getSamplerHealth, getReferenceAges } from "@/lib/health";

export const revalidate = 300;
export const maxDuration = 30;

export const metadata = {
  title: "System Status",
  description:
    "Live health of Urja Brief's data pipeline — whether each source is responding, how fresh the 15-minute grid sampler is, and how old every dated reference dataset has gone.",
};

const Dot = ({ ok }: { ok: boolean }) => (
  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-400"}`} aria-hidden="true" />
);

async function StatusBody() {
  const [sampler, sources] = await Promise.all([getSamplerHealth(), getLiveSources()]);
  const refs = getReferenceAges();
  const allOk = sampler.ok && sources.every((s) => s.ok) && refs.every((r) => !r.stale);

  return (
    <>
      <section className={`rounded-2xl border p-5 sm:p-6 ${allOk ? "border-emerald-300/25 bg-emerald-300/[0.06]" : "border-amber-300/25 bg-amber-300/[0.07]"}`}>
        <p className={`inline-flex items-center gap-2 text-lg font-semibold ${allOk ? "text-emerald-300" : "text-amber-200"}`}>
          <Dot ok={allOk} />
          {allOk ? "All systems nominal" : "Some sources need attention"}
        </p>
        <p className="mt-1.5 text-sm text-slate-300">
          The 15-minute grid sampler {sampler.lastSampleAgo ? `last committed a reading ${sampler.lastSampleAgo}` : "has no readings yet"}
          {sampler.todayCount ? ` · ${sampler.todayCount} sample${sampler.todayCount === 1 ? "" : "s"} today` : ""}.
        </p>
      </section>

      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">The grid sampler</p>
        <div className="mt-3 flex items-center gap-3">
          <Dot ok={sampler.ok} />
          <div>
            <p className="text-sm font-medium text-slate-200">{sampler.detail}</p>
            <p className="text-xs text-slate-500">
              {sampler.lastSampleAgo ? `Last sample ${sampler.lastSampleAgo}` : "No samples committed yet"} · runs ~hourly
              (GitHub throttles the 15-minute schedule).
            </p>
          </div>
        </div>
      </section>

      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Live sources</p>
        <div className="mt-4 divide-y divide-cyan-100/10">
          {sources.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex items-center gap-2.5 text-sm text-slate-200"><Dot ok={s.ok} />{s.name}</span>
              <span className="font-mono text-xs text-slate-400">{s.detail}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-cyan-100/10 pt-2 text-xs text-slate-500">
          A source marked down means that panel shows an honest &ldquo;unavailable&rdquo; notice — never a
          stale or invented number.
        </p>
      </section>

      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Reference data freshness</p>
        <p className="mt-2 text-sm text-slate-400">
          Some figures (tariffs, fuel prices, capacity) have no live feed and are dated reference
          values. Here&apos;s how old each has gone.
        </p>
        <div className="mt-4 divide-y divide-cyan-100/10">
          {refs.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex items-center gap-2.5 text-sm text-slate-200"><Dot ok={!r.stale} />{r.name}</span>
              <span className="font-mono text-xs text-slate-400">
                as of {r.asOf} · {r.ageMonths === 0 ? "current" : `${r.ageMonths} mo old`}
                {r.stale ? <span className="ml-2 text-amber-300">needs refresh</span> : ""}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function StatusPage() {
  return (
    <div className="flex flex-col gap-8 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-10 sm:px-10 sm:py-12">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">System status</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            Is the data actually flowing?
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            A site that promises honest numbers should prove its pipeline is alive. This page checks
            every source and dataset in real time — including the sampler that quietly feeds the
            records, forecasts, and curves.
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="urja-panel h-40 animate-pulse" />}>
        <StatusBody />
      </Suspense>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/methodology">
        ← Methodology
      </Link>
    </div>
  );
}
