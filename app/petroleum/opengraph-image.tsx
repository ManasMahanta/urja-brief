import { deskCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import fuel from "@/data/fuel-prices.json";

export const alt = "How much of India's petrol price is tax";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  // Delhi petrol: base + excise + dealer are ~fixed; the rest is VAT (see FuelBreakdown).
  const retail = (fuel.cities as Record<string, { petrol: number }>).Delhi.petrol;
  const tax = 19.9 + Math.max(0, retail - 55.66 - 19.9 - 3.77); // excise + VAT
  const pct = Math.round((tax / retail) * 100);
  return deskCard({
    kicker: "Where your fuel money goes",
    value: `${pct}%`,
    sub: "of a litre of petrol in Delhi is tax — plus crude imports, ethanol, and cooking fuel.",
    accent: "#fb7185",
  });
}
