import Link from "next/link";
import { getGridStress, type StressLevel } from "@/lib/stress";

const TONE: Record<StressLevel, { ring: string; text: string; dot: string }> = {
  calm: { ring: "border-emerald-300/25 bg-emerald-300/[0.06]", text: "text-emerald-300", dot: "bg-emerald-400" },
  elevated: { ring: "border-amber-300/25 bg-amber-300/[0.07]", text: "text-amber-200", dot: "bg-amber-400" },
  high: { ring: "border-rose-400/30 bg-rose-400/[0.07]", text: "text-rose-300", dot: "bg-rose-400" },
};

// Live grid-stress signal for the grid desk. Renders nothing if MERIT is down.
export default async function StressBadge() {
  const stress = await getGridStress();
  if (!stress) return null;
  const tone = TONE[stress.level];

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${tone.ring}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Grid stress · live</p>
        {stress.loadFactorPct !== null && (
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-400">
            {stress.loadFactorPct.toFixed(0)}% of sampled peak
          </span>
        )}
      </div>
      <p className={`mt-3 inline-flex items-center gap-2 text-lg font-semibold ${tone.text}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden="true" />
        {stress.headline}
      </p>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-300">{stress.detail}</p>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
        {stress.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
        A proxy from live demand and mix, not an official reserve-margin figure.{" "}
        <Link href="/subscribe" className="text-cyan-300 hover:text-white">Get an alert</Link> when the
        grid moves into a stressed hour.
      </p>
    </section>
  );
}
