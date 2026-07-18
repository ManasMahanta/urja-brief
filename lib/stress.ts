// A live "how hard is the grid working?" signal — the thing a grid-alert
// subscriber actually wants. MERIT gives no explicit reserve margin, so this is
// an honest proxy, not a control-room metric: how close current demand is to
// the highest we've ever sampled, and how much of that load coal is carrying.

import { getGridSnapshot } from "@/lib/grid-live";
import { getRecords } from "@/lib/samples";

export type StressLevel = "calm" | "elevated" | "high";

export type GridStress = {
  level: StressLevel;
  headline: string;
  detail: string;
  loadFactorPct: number | null; // demand now ÷ highest demand we've sampled
  reasons: string[];
};

const mw = (value: number) => `${Math.round(value).toLocaleString("en-IN")} MW`;

export async function getGridStress(): Promise<GridStress | null> {
  const snapshot = await getGridSnapshot();
  if (!snapshot) return null;
  const records = await getRecords();

  const peak = records.peakDemandMw?.value;
  const loadFactor = peak && peak > 0 ? snapshot.demandMetMw / peak : null;
  const thermalShare = snapshot.mix.thermal / snapshot.totalGenerationMw;
  const rePct = snapshot.renewableSharePct;

  const reasons: string[] = [];
  if (loadFactor !== null) {
    reasons.push(`Demand is ${(loadFactor * 100).toFixed(1)}% of the ${mw(peak!)} peak we've sampled.`);
  }
  reasons.push(`Coal-based thermal is carrying ${(thermalShare * 100).toFixed(0)}% of generation.`);
  reasons.push(`Renewables are ${rePct.toFixed(1)}% of the mix right now.`);

  let level: StressLevel = "calm";
  if (loadFactor !== null && loadFactor >= 0.97) level = "high";
  else if (loadFactor !== null && loadFactor >= 0.9) level = "elevated";
  else if (thermalShare >= 0.72 && rePct < 12) level = "elevated";

  const headline: Record<StressLevel, string> = {
    calm: "Grid running comfortably",
    elevated: "Grid working hard",
    high: "Grid near its sampled peak",
  };
  const detail: Record<StressLevel, string> = {
    calm:
      "Demand sits well below the highest we've sampled and generation has headroom. A normal operating hour.",
    elevated:
      "Demand is high or coal is doing most of the lifting with little renewable support — the kind of hour when reserves get thin and imports rise.",
    high:
      "Demand is within a whisker of the highest reading we've ever sampled. Hours like this are when load-shedding risk and peak power prices are greatest.",
  };

  return { level, headline: headline[level], detail: detail[level], loadFactorPct: loadFactor !== null ? loadFactor * 100 : null, reasons };
}
