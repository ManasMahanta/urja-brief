// The duck curve — the single most important solar-grid picture. Solar suppresses
// midday "net load" (demand minus solar) into a belly, then vanishes at sunset
// just as demand climbs, forcing a steep evening ramp that coal and hydro must
// cover. Built from our own 15-minute samples: solar is estimated as the
// renewable reading above its night-time floor (solar is zero after dark), and
// net load is demand minus that. It sharpens as the day's samples accumulate.

import { getLoadCurves, getRecentSamples } from "@/lib/samples";

const istHour = (iso: string): number =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date(iso))) % 24;

export type DuckPoint = { t: string; demandMw: number; solarMw: number; netLoadMw: number };

export type DuckCurve = {
  points: DuckPoint[];
  peakSolarMw: number;
  eveningRamp: { mw: number; fromT: string; toT: string } | null;
};

export async function getDuckCurve(): Promise<DuckCurve | null> {
  const [{ today }, recent] = await Promise.all([getLoadCurves(), getRecentSamples(2)]);
  if (today.length < 4) return null;

  // Night-time floor of renewables ≈ non-solar RE (wind + hydro-RE + biomass).
  const nightVals = recent
    .filter((s) => { const h = istHour(s.t); return h >= 21 || h <= 5; })
    .map((s) => s.mix.renewable ?? 0)
    .filter((v) => v > 0);
  const baseline = nightVals.length ? Math.min(...nightVals) : 0;

  const points: DuckPoint[] = today.map((s) => {
    const solarMw = Math.max(0, (s.mix.renewable ?? 0) - baseline);
    return { t: s.t, demandMw: s.demandMw, solarMw, netLoadMw: s.demandMw - solarMw };
  });

  // Evening ramp = rise in net load from the midday belly to the evening peak.
  const afternoon = points.filter((p) => { const h = istHour(p.t); return h >= 10 && h <= 16; });
  const evening = points.filter((p) => { const h = istHour(p.t); return h >= 17 && h <= 23; });
  let eveningRamp: DuckCurve["eveningRamp"] = null;
  if (afternoon.length && evening.length) {
    const belly = afternoon.reduce((a, b) => (b.netLoadMw < a.netLoadMw ? b : a));
    const peak = evening.reduce((a, b) => (b.netLoadMw > a.netLoadMw ? b : a));
    if (peak.netLoadMw > belly.netLoadMw) {
      eveningRamp = { mw: peak.netLoadMw - belly.netLoadMw, fromT: belly.t, toT: peak.t };
    }
  }

  return { points, peakSolarMw: Math.max(...points.map((p) => p.solarMw)), eveningRamp };
}
