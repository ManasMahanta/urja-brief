// Live grid carbon intensity, derived from the same per-fuel MERIT mix the
// rest of the site already fetches. No new upstream: the generation split
// (thermal / gas / nuclear / hydro / renewable / storage / other) is enough to
// compute how many grams of CO2 each kilowatt-hour carries at this instant.
//
// These are OPERATIONAL (combustion, at-the-stack) factors — what is coming
// out of the plants running right now — not lifecycle factors. That is a
// deliberate choice: it makes the number swing with how much coal is burning,
// which is exactly the signal a reader wants ("is now a clean hour?"). It also
// means hydro, nuclear, solar and wind read as ~0 here; their (small) lifecycle
// emissions are real but are not what changes minute to minute.
//
// Sources for the factors: CEA CO2 Baseline Database (Indian coal fleet runs
// ~0.9-1.0 tCO2/MWh at the busbar) and IPCC AR5 median combustion figures.

import { getGridSnapshot, type FuelMix, type GridSnapshot } from "@/lib/grid-live";
import { getLoadCurves } from "@/lib/samples";

// gCO2 per kWh, operational. Keys match FuelMix / GridSample.mix.
export const EMISSION_FACTORS: Record<string, number> = {
  thermal: 940, // coal-dominated; Indian fleet is high-ash
  gas: 490,
  nuclear: 0,
  hydro: 0,
  renewable: 0, // solar + wind, at generation
  storage: 0, // energy is counted when it was charged, not on discharge
  other: 700, // small, opaque line (diesel/biomass); costed conservatively
};

export const FACTOR_NOTE =
  "Operational grams of CO2 per kWh — what the plants running right now emit at the stack. " +
  "Coal is counted at 940, gas at 490; hydro, nuclear, solar and wind at 0 (their lifecycle " +
  "emissions are real but tiny and do not vary through the day). Factors from the CEA CO2 " +
  "Baseline Database and IPCC AR5. This is an estimate of live intensity, not an audited figure.";

// Weighted average intensity across the whole mix. Accepts a FuelMix or any
// GridSample.mix (a plain Record). Returns gCO2/kWh, or null if the mix is empty.
export function carbonIntensity(mix: Record<string, number>): number | null {
  let generation = 0;
  let emissions = 0;
  for (const [fuel, mw] of Object.entries(mix)) {
    if (!(mw > 0)) continue;
    generation += mw;
    emissions += mw * (EMISSION_FACTORS[fuel] ?? 0);
  }
  if (generation <= 0) return null;
  return emissions / generation;
}

export type CleanTone = "clean" | "average" | "dirty";

export type CarbonNow = {
  snapshot: GridSnapshot;
  intensityGco2: number;
  // Today's intensity spread, from the 15-minute samples (IST day so far).
  today: { min: number; max: number; median: number; count: number } | null;
  // How the current reading sits inside today's range, and a plain verdict.
  verdict: { tone: CleanTone; headline: string; detail: string } | null;
  // Live emissions, derived from the mix (all from the snapshot — no samples).
  rateTonnesPerHour: number; // CO2 the grid is emitting right now
  avoidedTonnesPerHour: number; // CO2 clean power is keeping out of the air now
  cleanGenMw: number; // renewable + hydro + nuclear + storage
};

// What an *extra* kWh of demand actually causes: in India the marginal plant is
// almost always coal, so the marginal factor is far above the average intensity.
export const MARGINAL_GCO2 = EMISSION_FACTORS.thermal;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Everything the /carbon desk and the home badge need: the live intensity, plus
// where it sits in today's own range so the verdict is relative to this grid on
// this day, not an absolute threshold that would read differently in summer.
export async function getCarbonNow(): Promise<CarbonNow | null> {
  const snapshot = await getGridSnapshot();
  if (!snapshot) return null;
  const intensityGco2 = carbonIntensity(snapshot.mix);
  if (intensityGco2 === null) return null;

  const { today: samples } = await getLoadCurves();
  const series = samples
    .map((sample) => carbonIntensity(sample.mix))
    .filter((value): value is number => value !== null);

  // Fewer than four samples can't establish a "usual" for the day.
  let today: CarbonNow["today"] = null;
  let verdict: CarbonNow["verdict"] = null;
  if (series.length >= 4) {
    const med = median(series);
    today = { min: Math.min(...series), max: Math.max(...series), median: med, count: series.length };

    if (intensityGco2 <= med * 0.9) {
      verdict = {
        tone: "clean",
        headline: "Cleaner than usual right now",
        detail:
          "The grid is running lighter on coal than it has for most of today — a good window to run heavy loads like a geyser, washing machine, or an EV charge.",
      };
    } else if (intensityGco2 >= med * 1.1) {
      verdict = {
        tone: "dirty",
        headline: "Dirtier than usual right now",
        detail:
          "Coal is carrying more of the load than it did earlier today — usually the post-sunset evening peak, when solar is gone. Heavy loads now lean harder on fossil generation.",
      };
    } else {
      verdict = {
        tone: "average",
        headline: "About average for today",
        detail:
          "The grid's carbon intensity is close to its typical level for today — neither an especially clean nor an especially dirty hour to draw power.",
      };
    }
  }

  // Emissions rate: generation (MW) × intensity (g/kWh) ÷ 1000 = tonnes/hour.
  const rateTonnesPerHour = (snapshot.totalGenerationMw * intensityGco2) / 1000;
  // Zero-carbon generation right now; if it were coal instead, that's the CO2 avoided.
  const cleanGenMw = snapshot.mix.renewable + snapshot.mix.hydro + snapshot.mix.nuclear + snapshot.mix.storage;
  const avoidedTonnesPerHour = (cleanGenMw * EMISSION_FACTORS.thermal) / 1000;

  return { snapshot, intensityGco2, today, verdict, rateTonnesPerHour, avoidedTonnesPerHour, cleanGenMw };
}

export const TONE_COLOR: Record<CleanTone, { text: string; ring: string; dot: string }> = {
  clean: { text: "text-emerald-300", ring: "border-emerald-300/25 bg-emerald-300/[0.06]", dot: "bg-emerald-400" },
  average: { text: "text-amber-200", ring: "border-amber-300/20 bg-amber-300/[0.06]", dot: "bg-amber-400" },
  dirty: { text: "text-rose-300", ring: "border-rose-400/25 bg-rose-400/[0.06]", dot: "bg-rose-400" },
};

// Re-export so callers can type against the mix without importing grid-live too.
export type { FuelMix };
