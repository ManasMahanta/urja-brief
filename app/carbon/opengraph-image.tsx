import { getCarbonNow } from "@/lib/carbon";
import { deskCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Live carbon intensity of India's power grid";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  let value = "live";
  let sub = "How clean India's electricity is right now — and when to run heavy loads.";
  let accent = "#67e8f9";
  try {
    const c = await getCarbonNow();
    if (c) {
      value = String(Math.round(c.intensityGco2));
      sub = c.verdict ? `${c.verdict.headline}.` : "Grams of CO2 per unit of electricity, right now.";
      accent = c.verdict?.tone === "clean" ? "#34d399" : c.verdict?.tone === "dirty" ? "#fb7185" : "#fbbf24";
    }
  } catch {
    // fall back to the generic card
  }
  return deskCard({ kicker: "Grid carbon intensity", value, unit: "g/kWh", sub, accent });
}
