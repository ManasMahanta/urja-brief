import { callGLM } from "@/lib/glm";
import { getGridSnapshot, getStatewisePower } from "@/lib/grid-live";
import { getEnergyHeadlines, getPowerQuotes, officialSources } from "@/lib/power";

// Shared weekly-issue generator, used by both the on-demand drafter
// (/api/draft-issue, returns a downloadable file) and the automated
// publisher (/api/publish-issue, opens a GitHub PR). Returns the MDX
// document (starting with "---") or null on failure.
export async function generateIssueMdx(): Promise<string | null> {
  const [snapshot, states, quotes, headlines] = await Promise.all([
    getGridSnapshot(),
    getStatewisePower(),
    getPowerQuotes(),
    getEnergyHeadlines(12),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const digest = [
    snapshot
      ? [
          `ALL-INDIA POWER POSITION (MERIT, fetched ${snapshot.fetchedAt}):`,
          `- Demand met: ${Math.round(snapshot.demandMetMw).toLocaleString("en-IN")} MW`,
          `- Generation mix (MW): thermal ${snapshot.mix.thermal}, hydro ${snapshot.mix.hydro}, renewable ${snapshot.mix.renewable}, nuclear ${snapshot.mix.nuclear}, gas ${snapshot.mix.gas}`,
          `- Renewable share of generation: ${snapshot.renewableSharePct.toFixed(1)}%`,
        ].join("\n")
      : "ALL-INDIA POWER POSITION: unavailable at draft time.",
    "\nTOP STATES BY DEMAND MET (MERIT, MW):",
    ...states.slice(0, 8).map((state) => `- ${state.name}: ${state.demandMetMw.toLocaleString("en-IN")} MW`),
    "\nLISTED POWER COMPANIES (market context only, never a grid reading):",
    ...quotes.map((quote) => `- ${quote.name} (${quote.symbol}): ₹${quote.price.toFixed(2)}, ${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`),
    "\nPOWER-SECTOR HEADLINES:",
    ...headlines.map((headline) => `- ${headline.title} [${headline.url}]`),
    "\nOFFICIAL SOURCES:",
    ...officialSources.map((source) => `- ${source.name} (${source.cadence}): ${source.detail}`),
  ].join("\n");

  const system =
    "You draft weekly issues for Urja Brief, a newsletter on India's power system. " +
    "Given the week's grid data and headlines, write a complete issue as MDX with " +
    "this exact structure:\n\n" +
    "1. YAML frontmatter: title (format: 'Issue #N: <clear headline>' — leave N as " +
    `a literal N for the editor), date ("${today}"), summary (one-sentence hook), ` +
    "tags (2-3 from: grid, renewables, fuels, policy, companies), featured: false.\n" +
    "2. Sections, in order: '## Grid Pulse' (demand met, generation mix, renewable " +
    "share — cite MERIT and the fetch time, 3 bullets), '## The Big Signal' (the " +
    "week's most consequential development, ~180 words, with 'What happened' and " +
    "'Why it matters'), '## Transition Watch' (renewables, storage, transmission), " +
    "'## Fuel & Reliability' (coal, gas, hydro conditions — only what the headlines " +
    "support), '## Policy Desk' (CEA / Ministry of Power / MNRE items), " +
    "'## Lightning Round' (5 one-liners with links), '## One Question' (an open " +
    "question worth watching — framed as observation, not prediction).\n\n" +
    "Link to sources with markdown links using the URLs provided. MW figures are " +
    "instantaneous MERIT readings, not daily energy — never present them as MU or " +
    "as official CEA records. Listed-company moves are market context, never grid " +
    "outcomes. Write like a careful systems reporter — zero hype, no forecasts, no " +
    "investment advice, and never invent numbers, causes, or policy effects the " +
    "data doesn't support. If a section has no supporting material, say so in one " +
    "line. Output ONLY the MDX document, starting with '---'.";

  const raw = await callGLM(system, digest, 8000);
  if (!raw) return null;
  // Models sometimes wrap output in a code fence despite instructions.
  const mdx = raw
    .replace(/^```(?:mdx|markdown)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return mdx.startsWith("---") ? mdx : null;
}
