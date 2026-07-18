import { getStateBySlug } from "@/lib/grid-live";
import { deskCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Live electricity demand for this state";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const name = state.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let value = "live";
  let sub = "Live electricity demand, own generation, and imports from the Ministry of Power.";
  try {
    const result = await getStateBySlug(state);
    if (result?.power) {
      value = Math.round(result.power.demandMetMw / 1000).toLocaleString("en-IN");
      sub = `${name}'s electricity demand met right now, sampled from MERIT.`;
    }
  } catch {
    // fall back to the generic card
  }
  return deskCard({ kicker: `${name} · demand met`, value, unit: "GW", sub, accent: "#22d3ee" });
}
