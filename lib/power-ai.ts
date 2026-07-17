import { unstable_cache } from "next/cache";
import { callGLM, glmConfigured } from "@/lib/glm";
import { getGridSnapshot } from "@/lib/grid-live";
import { getEnergyHeadlines, getPowerQuotes, officialSources } from "@/lib/power";

export async function powerContext() {
  const [snapshot, quotes, headlines] = await Promise.all([
    getGridSnapshot(),
    getPowerQuotes(),
    getEnergyHeadlines(8),
  ]);
  return [
    "URJA BRIEF SOURCE CONTEXT",
    snapshot
      ? [
          `Live all-India power position (MERIT dashboard, instantaneous MW, fetched ${snapshot.fetchedAt}):`,
          `- Demand met: ${Math.round(snapshot.demandMetMw).toLocaleString("en-IN")} MW`,
          `- Thermal ${snapshot.mix.thermal.toLocaleString("en-IN")} MW, hydro ${snapshot.mix.hydro.toLocaleString("en-IN")} MW, renewable ${snapshot.mix.renewable.toLocaleString("en-IN")} MW, nuclear ${snapshot.mix.nuclear.toLocaleString("en-IN")} MW, gas ${snapshot.mix.gas.toLocaleString("en-IN")} MW`,
          `- Renewable share of current generation: ${snapshot.renewableSharePct.toFixed(1)}%`,
        ].join("\n")
      : "Live all-India power position: unavailable right now.",
    "Listed power-company market context (not physical grid data):",
    ...quotes.map((quote) => `- ${quote.name} (${quote.symbol}): ₹${quote.price.toFixed(2)}, ${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}% today`),
    "Recent India power-sector headlines (headlines only; do not add details beyond their wording):",
    ...headlines.map((headline) => `- ${headline.title}`),
    "Official reporting sources:",
    ...officialSources.map((source) => `- ${source.name} (${source.cadence}): ${source.detail}`),
  ].join("\n");
}

async function generateBrief() {
  if (!glmConfigured()) return null;
  const context = await powerContext();
  if (!context.includes("- ")) return null;
  return callGLM(
    "You are Urja Brief's cautious India power-system editor. Write exactly three short bullets titled 'Signal', 'Why it matters', and 'Watch next'. Use only the supplied context. MERIT figures are instantaneous MW readings at fetch time — not daily energy, peaks, or official CEA records. Listed-company price movement is market context only: never call it a physical-grid outcome. Headline text is not a verified fact beyond the wording of that headline. Do not predict, recommend trades, give dispatch advice, or invent figures, causes, policy effects, or sources. If the context is thin, say what cannot be established.",
    context,
    550,
  );
}

export const getPowerBrief = unstable_cache(generateBrief, ["urja-power-brief"], {
  revalidate: 900,
  tags: ["urja-power-brief"],
});
