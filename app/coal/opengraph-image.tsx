import { getCoalStock } from "@/lib/coal";
import { deskCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "India's coal stock at power plants";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  let value = "coal";
  let sub = "Days of coal at India's power plants — the early warning before load-shedding.";
  let accent = "#fbbf24";
  try {
    const c = await getCoalStock();
    if (c) {
      value = c.daysOfStock.toFixed(1);
      sub = `Days of coal in stock · ${c.criticalPlants} plants at critical levels (CEA, as on ${c.asOn}).`;
      accent = c.daysOfStock >= 15 ? "#34d399" : c.daysOfStock >= 8 ? "#fbbf24" : "#fb7185";
    }
  } catch {
    // fall back to the generic card
  }
  return deskCard({ kicker: "National coal stock", value, unit: "days", sub, accent });
}
