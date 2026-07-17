import { callGLM } from "@/lib/glm";
import {
  formatChange,
  getHeadlineIndices,
  getMarketNews,
  getMovers,
  getSectorHeat,
  getTrendingTickers,
} from "@/lib/market";

// Shared weekly-issue generator, used by both the on-demand drafter
// (/api/draft-issue, returns a downloadable file) and the automated
// publisher (/api/publish-issue, opens a GitHub PR). Returns the MDX
// document (starting with "---") or null on failure.
export async function generateIssueMdx(): Promise<string | null> {
  const [indices, movers, sectors, news, trending] = await Promise.all([
    getHeadlineIndices(),
    getMovers(6),
    getSectorHeat(),
    getMarketNews(12),
    getTrendingTickers(8),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const digest = [
    "HEADLINE INDICES:",
    ...indices.map((i) => `- ${i.name}: ${i.price.toFixed(2)} (${formatChange(i.changePercent)})`),
    "\nTOP GAINERS:",
    ...movers.gainers.map((m) => `- ${m.name} (${m.symbol}): ${formatChange(m.changePercent)}`),
    "\nTOP LOSERS:",
    ...movers.losers.map((m) => `- ${m.name} (${m.symbol}): ${formatChange(m.changePercent)}`),
    "\nSECTOR PERFORMANCE:",
    ...sectors.map((s) => `- ${s.name}: ${formatChange(s.changePercent)}`),
    "\nTRENDING TICKERS:",
    ...trending.map((t) => `- ${t.name} (${t.symbol})`),
    "\nMARKET HEADLINES:",
    ...news.map((n) => `- [${n.source}] ${n.title} [${n.url}]`),
  ].join("\n");

  const system =
    "You draft weekly issues for Bazaar Brief, an Indian stock-market newsletter. " +
    "Given a week of live market data, write a complete issue as MDX with this exact " +
    "structure:\n\n" +
    "1. YAML frontmatter: title (format: 'Issue #N: <punchy headline>' — leave N as " +
    `a literal N for the editor), date ("${today}"), summary (one-sentence hook), ` +
    "tags (2-3 from: markets, results, ipo, sectors, macro, global-flows), " +
    "featured: false.\n" +
    "2. Sections, in order: '## Market Pulse' (where Nifty/Sensex/Bank Nifty closed, " +
    "3 bullets), '## The Big Move' (the week's most consequential story, ~180 words, " +
    "with 'What happened' and 'Why it matters' angles), '## Results Radar' (2 earnings " +
    "stories in plain English with the 'so what' for the stock), '## Sector Watch' " +
    "(where money rotated), '## IPO & Listings' (any notable IPOs/listings), " +
    "'## Lightning Round' (5 one-liners with links), '## One Idea' (a screen or watchlist " +
    "theme worth researching — framed as research, not a recommendation).\n\n" +
    "Link to sources with markdown links using the URLs provided. Write like a sharp, " +
    "neutral market reporter — zero hype, never tell readers to buy or sell, and never " +
    "invent numbers the data doesn't support. Output ONLY the MDX document, starting " +
    "with '---'.";

  const raw = await callGLM(system, digest, 8000);
  if (!raw) return null;
  // Models sometimes wrap output in a code fence despite instructions.
  const mdx = raw
    .replace(/^```(?:mdx|markdown)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return mdx.startsWith("---") ? mdx : null;
}
