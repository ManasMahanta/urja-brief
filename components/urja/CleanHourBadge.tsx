import Link from "next/link";
import { getCarbonNow, TONE_COLOR } from "@/lib/carbon";

// Compact teaser for the home desk: the live carbon intensity and the plain
// clean-hour verdict, linking through to the full /carbon desk. Renders nothing
// if the mix is unavailable — never a stale number.
export default async function CleanHourBadge() {
  const carbon = await getCarbonNow();
  if (!carbon) return null;

  const { intensityGco2, verdict } = carbon;
  const tone = verdict ? TONE_COLOR[verdict.tone] : TONE_COLOR.average;

  return (
    <Link href="/carbon" className={`group block rounded-2xl border p-5 transition hover:brightness-110 ${tone.ring}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden="true" />
          <div>
            <p className="urja-kicker">Grid carbon · live</p>
            <p className={`mt-1 font-semibold ${tone.text}`}>
              {verdict ? verdict.headline : "Live carbon intensity"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-mono text-3xl font-semibold ${tone.text}`}>
            {Math.round(intensityGco2)}<span className="ml-1 text-sm font-normal text-slate-400">g/kWh</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-400 group-hover:text-slate-200">Open the carbon desk →</p>
        </div>
      </div>
    </Link>
  );
}
