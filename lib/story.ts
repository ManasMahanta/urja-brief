// "Grid story of the day" — the site noticing what's unusual, instead of just
// showing numbers. We score a handful of candidate observations against the
// live snapshot, our observed records, and the recent history, then surface the
// single most notable one as a plain headline. Everything is derived from data
// already on the desk; nothing is invented, and it returns null when nothing
// stands out rather than manufacturing drama.

import { getGridSnapshot } from "@/lib/grid-live";
import { getRecords, getRecentRollups } from "@/lib/samples";
import { getCarbonNow } from "@/lib/carbon";

export type StoryTone = "alert" | "good" | "neutral";
export type GridStory = { headline: string; detail: string; tone: StoryTone };

const mw = (v: number) => `${Math.round(v).toLocaleString("en-IN")} MW`;

export async function getGridStory(): Promise<GridStory | null> {
  const [snapshot, records, rollups, carbon] = await Promise.all([
    getGridSnapshot(),
    getRecords(),
    getRecentRollups(),
    getCarbonNow(),
  ]);
  if (!snapshot) return null;

  const candidates: Array<{ score: number; story: GridStory }> = [];
  const add = (score: number, tone: StoryTone, headline: string, detail: string) =>
    candidates.push({ score, story: { headline, detail, tone } });

  // 1. Demand testing the observed record.
  if (records.peakDemandMw) {
    const ratio = snapshot.demandMetMw / records.peakDemandMw.value;
    if (ratio >= 0.995) {
      add(100, "alert", "Demand is at a new high for our record", `All-India demand met is ${mw(snapshot.demandMetMw)} — the highest this site has sampled.`);
    } else if (ratio >= 0.97) {
      add(85, "alert", "Demand is testing its peak", `At ${mw(snapshot.demandMetMw)}, demand is within ${((1 - ratio) * 100).toFixed(1)}% of the highest we've sampled (${mw(records.peakDemandMw.value)}). Hours like this are when reserves get thin.`);
    }
  }

  // 2. Renewables running unusually high (vs the best days we've logged).
  const recentMaxRe = rollups.slice(0, 14).reduce((m, d) => Math.max(m, d.maxRePct), 0);
  if (snapshot.renewableSharePct >= 30 && (recentMaxRe === 0 || snapshot.renewableSharePct >= recentMaxRe - 1)) {
    add(78, "good", `Renewables are carrying ${snapshot.renewableSharePct.toFixed(0)}% of the grid`, `Solar, wind and hydro are ${snapshot.renewableSharePct.toFixed(1)}% of generation right now — around the strongest share we've seen lately.`);
  }

  // 3. Carbon intensity notably clean or dirty for the day.
  if (carbon?.verdict?.tone === "clean") {
    add(70, "good", "One of today's cleanest hours", `The grid is at ${Math.round(carbon.intensityGco2)} g/kWh — lighter on coal than most of today. A good window for heavy loads.`);
  } else if (carbon?.verdict?.tone === "dirty") {
    add(66, "alert", "A coal-heavy hour", `Carbon intensity is ${Math.round(carbon.intensityGco2)} g/kWh — coal is carrying more than usual, typical of the evening peak.`);
  }

  // 4. Storage doing real work (India's battery/pumped-hydro fleet is small).
  if (snapshot.mix.storage >= 2000) {
    add(64, "good", "Storage is pulling its weight", `Grid storage is supplying ${mw(snapshot.mix.storage)} right now — pumped-hydro and batteries shifting power into the peak.`);
  }

  // 5. Fallback: a plain but true observation, so the slot is rarely empty.
  add(20, "neutral", "The grid, right now", `${mw(snapshot.demandMetMw)} of demand met, with renewables at ${snapshot.renewableSharePct.toFixed(1)}% of generation.`);

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.story ?? null;
}
