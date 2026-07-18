import { getCleanForecast, hourLabel } from "@/lib/clean-forecast";

// Two-segment lerp: clean (emerald) → mid (amber) → dirty (rose). t in [0,1].
function toneColor(t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  const lerp = (a: number, b: number, x: number) => Math.round(a + (b - a) * x);
  let r: number, g: number, b: number;
  if (clamp < 0.5) {
    const x = clamp / 0.5;
    [r, g, b] = [lerp(52, 251, x), lerp(211, 191, x), lerp(153, 36, x)];
  } else {
    const x = (clamp - 0.5) / 0.5;
    [r, g, b] = [lerp(251, 251, x), lerp(191, 113, x), lerp(36, 133, x)];
  }
  return `rgb(${r} ${g} ${b})`;
}

export default async function CleanHourForecast() {
  const forecast = await getCleanForecast();

  if (!forecast) {
    return (
      <section className="urja-panel p-5 sm:p-6">
        <p className="urja-kicker">Cleanest hours — typical day</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Not enough sampled history yet to show a reliable by-hour profile. This fills in as the
          15-minute sampler accumulates days — no synthetic curve is shown in the meantime.
        </p>
      </section>
    );
  }

  const { hours, min, max, bestWindow, daysCovered, todayRemaining } = forecast;
  const span = max - min || 1;
  const byHour = new Map(hours.map((h) => [h.hour, h]));

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Cleanest hours — typical day</p>
        <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
          {daysCovered} day{daysCovered === 1 ? "" : "s"} sampled
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        On a typical day so far, the grid is cleanest around{" "}
        <span className="font-semibold text-emerald-300">
          {hourLabel(bestWindow.startHour)}–{hourLabel(bestWindow.endHour)}
        </span>{" "}
        — the best window to shift heavy loads like a geyser, washing machine, or an EV charge.
      </p>

      {/* 24-hour bar strip: height and colour both track typical intensity. */}
      <div className="mt-5 flex h-28 items-end gap-[3px]" role="img" aria-label="Typical carbon intensity by hour of day">
        {Array.from({ length: 24 }, (_, h) => {
          const stat = byHour.get(h);
          const inBest =
            bestWindow.endHour > bestWindow.startHour
              ? h >= bestWindow.startHour && h < bestWindow.endHour
              : h >= bestWindow.startHour || h < bestWindow.endHour;
          if (!stat) {
            return <div key={h} className="flex-1 rounded-sm bg-slate-800/40" style={{ height: "8%" }} title={`${hourLabel(h)}: no data`} />;
          }
          const t = (stat.avgGco2 - min) / span;
          return (
            <div
              key={h}
              className={`flex-1 rounded-sm ${inBest ? "ring-2 ring-emerald-300/70 ring-offset-1 ring-offset-[#080c16]" : ""}`}
              style={{ height: `${20 + t * 80}%`, backgroundColor: toneColor(t) }}
              title={`${hourLabel(h)}: ~${Math.round(stat.avgGco2)} g/kWh (avg of ${stat.samples})`}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[0.6rem] text-slate-600">
        <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: toneColor(0) }} /> cleaner (~{Math.round(min)} g/kWh)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: toneColor(1) }} /> dirtier (~{Math.round(max)} g/kWh)</span>
      </div>

      {todayRemaining.length > 0 && (
        <p className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm leading-relaxed text-emerald-100/90">
          Cleaner hours still ahead today:{" "}
          <span className="font-semibold text-emerald-200">
            {todayRemaining.map((h) => hourLabel(h.hour)).join(", ")}
          </span>
          .
        </p>
      )}

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        A pattern from past samples, not a promise about a specific day — weather shifts solar and
        demand. It shows when the grid is <em>usually</em> cleanest, so you can plan flexible loads.
      </p>
    </section>
  );
}
