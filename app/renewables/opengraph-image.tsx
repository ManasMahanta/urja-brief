import { getEstimatedReSplit } from "@/lib/renewables";
import { deskCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "India's live solar and wind generation";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  let value = "solar";
  let sub = "Solar, wind, the duck curve, and a rooftop-solar calculator for your city.";
  try {
    const s = await getEstimatedReSplit();
    if (s) {
      value = `${Math.round(s.solarSharePct)}%`;
      sub = `Solar's estimated share of renewables right now · ${Math.round(s.renewableMw / 1000)} GW of renewables flowing.`;
    }
  } catch {
    // fall back to the generic card
  }
  return deskCard({ kicker: "Solar share of renewables", value, sub, accent: "#fbbf24" });
}
