import { unstable_cache } from "next/cache";
import { callGLM } from "@/lib/glm";
import {
  formatChange,
  getHeadlineIndices,
  getMarketNews,
  getMovers,
  getSectorHeat,
} from "@/lib/market";

// The daily market brief: GLM-4.5 reads today's live market feeds and writes a
// short synthesis — real market commentary, not another list. Cached for 24h;
// the daily cron's revalidateTag("daily-brief") forces regeneration.
// Degrades gracefully: returns null (section hidden) when ZAI_API_KEY is unset.

async function generateBrief(): Promise<string | null> {
  const [indices, movers, sectors, news] = await Promise.all([
    getHeadlineIndices(),
    getMovers(5),
    getSectorHeat(),
    getMarketNews(8),
  ]);

  const digest = [
    "HEADLINE INDICES (today):",
    ...indices.map((i) => `- ${i.name}: ${i.price.toFixed(2)} (${formatChange(i.changePercent)})`),
    "\nTOP GAINERS:",
    ...movers.gainers.map((m) => `- ${m.name} (${m.symbol}): ${formatChange(m.changePercent)}`),
    "\nTOP LOSERS:",
    ...movers.losers.map((m) => `- ${m.name} (${m.symbol}): ${formatChange(m.changePercent)}`),
    "\nSECTOR PERFORMANCE:",
    ...sectors.map((s) => `- ${s.name}: ${formatChange(s.changePercent)}`),
    "\nMARKET HEADLINES:",
    ...news.map((n) => `- [${n.source}] ${n.title}`),
  ].join("\n");

  try {
    return await callGLM(
      "You write the daily market brief for Bazaar Brief, an Indian stock-market " +
        "newsletter site. Given today's live market data, write 3-5 sentences of " +
        "genuine synthesis: name where the Nifty and Sensex are and why, connect " +
        "the sector rotation to the movers and headlines, and note what market " +
        "watchers should keep an eye on. Refer to specific indices, stocks, or news " +
        "by name. No bullet points, no headers, no preamble — just the prose " +
        "paragraph. Plain text only, no markdown. Confident, concrete, and neutral: " +
        "describe the market, never tell anyone to buy or sell. No hype words like " +
        "'exciting' or 'multibagger'.",
      digest,
      1200,
    );
  } catch {
    // Never let a model error break the homepage — the section just hides.
    return null;
  }
}

export const getDailyBrief = unstable_cache(generateBrief, ["daily-brief"], {
  revalidate: 86400,
  tags: ["daily-brief"],
});
