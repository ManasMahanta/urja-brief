import { getGridSnapshot } from "@/lib/grid-live";
import { deskCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "India's live electricity demand and generation mix";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  let value = "live";
  let sub = "All-India demand met and the generation mix, straight from the Ministry of Power.";
  try {
    const s = await getGridSnapshot();
    if (s) {
      value = Math.round(s.demandMetMw / 1000).toLocaleString("en-IN");
      sub = `All-India demand met · renewables ${s.renewableSharePct.toFixed(0)}% of generation right now.`;
    }
  } catch {
    // fall back to the generic card
  }
  return deskCard({ kicker: "All-India demand met", value, unit: "GW", sub, accent: "#22d3ee" });
}
