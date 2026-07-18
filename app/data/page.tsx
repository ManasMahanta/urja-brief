import Link from "next/link";
import { istDate } from "@/lib/samples";

export const revalidate = 3600;

export const metadata = {
  title: "Open Data",
  description:
    "India's power grid as open data: a 15-minute time series of demand, generation mix, renewable share, and carbon intensity — free to download and build on, CC BY 4.0.",
};

const Endpoint = ({ method, path, desc }: { method: string; path: string; desc: string }) => (
  <div className="rounded-lg border border-cyan-100/10 bg-slate-950/50 p-4">
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded bg-cyan-300/15 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-cyan-200">{method}</span>
      <code className="font-mono text-sm text-slate-100">{path}</code>
    </div>
    <p className="mt-2 text-sm text-slate-400">{desc}</p>
  </div>
);

export default function DataPage() {
  const today = istDate(0);

  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="urja-hero relative overflow-hidden rounded-2xl border border-cyan-200/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="urja-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="urja-kicker">Open data</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            India&apos;s grid, downloadable.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            We sample the Ministry of Power&apos;s MERIT dashboard every ~15 minutes and keep the
            series. Demand, the full generation mix, renewable share, and derived carbon intensity —
            free to download, chart, and build on. No login, no key, CC&nbsp;BY&nbsp;4.0.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="urja-panel p-5 sm:p-6">
          <p className="urja-kicker">Download</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            One IST day of 15-minute samples, as CSV. Change the date in the URL for any past day the
            sampler covered.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`/api/grid/samples?date=${today}&format=csv`}
              className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Download today&apos;s CSV
            </a>
            <a
              href="/api/grid"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-cyan-100/20 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/50"
            >
              Live snapshot (JSON) ↗
            </a>
          </div>
        </div>
        <div className="urja-panel p-5 sm:p-6">
          <p className="urja-kicker">What&apos;s in each row</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
            <li><code className="text-cyan-200">time</code> — ISO timestamp of the reading</li>
            <li><code className="text-cyan-200">demandMw</code> — all-India demand met</li>
            <li><code className="text-cyan-200">renewableSharePct</code> — renewables ÷ generation</li>
            <li><code className="text-cyan-200">carbonIntensityGco2PerKwh</code> — derived, operational</li>
            <li><code className="text-cyan-200">…Mw</code> — thermal, gas, nuclear, hydro, renewable, storage, other</li>
          </ul>
        </div>
      </section>

      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">API</p>
        <div className="mt-4 grid gap-3">
          <Endpoint method="GET" path="/api/grid" desc="Latest live snapshot — demand, mix, renewable share, carbon intensity. CORS-open, cached ~5 min." />
          <Endpoint method="GET" path="/api/grid/samples?date=YYYY-MM-DD" desc="A full IST day of 15-minute samples as JSON. Omit date for today." />
          <Endpoint method="GET" path="/api/grid/samples?date=YYYY-MM-DD&format=csv" desc="The same day as a CSV download." />
        </div>
        <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
          The series is only as complete as the sampler&apos;s uptime — gaps mean the sampler or MERIT
          was down, never that the grid was quiet. These are instantaneous readings, not official CEA
          energy figures. For the record of daily peaks and generation, use the{" "}
          <a href="https://cea.nic.in" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-white">CEA</a>.
        </p>
      </section>

      <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-200">Licence</p>
        <p className="mt-3 text-sm leading-relaxed text-emerald-100/85">
          Creative Commons Attribution 4.0. Use it anywhere — research, journalism, an app, a class —
          just credit <span className="font-semibold">Urja Brief</span> and link back. If you build
          something with it, we&apos;d love to see it.
        </p>
      </section>

      <Link className="text-sm font-semibold text-cyan-300 hover:text-white" href="/carbon">
        ← Carbon desk
      </Link>
    </div>
  );
}
