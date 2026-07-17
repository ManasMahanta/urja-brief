import { getAllIssues } from "@/lib/issues";
import { glossary, slugifyTerm } from "@/lib/glossary";
import { learnLevels } from "@/lib/academy";
import { coveredStocks } from "@/lib/stocks-data";

export type SearchDoc = {
  title: string;
  snippet: string;
  url: string;
  kind: "Issue" | "Glossary" | "Learn" | "Stock" | "Page";
};

const snippet = (text: string, max = 160) =>
  text.replace(/\s+/g, " ").trim().slice(0, max);

const STATIC_PAGES: SearchDoc[] = [
  { title: "Markets", snippet: "Live pulse on Indian markets: indices, gainers and losers, sector heat, trending stocks, and a quote lookup.", url: "/markets", kind: "Page" },
  { title: "IPO Center", snippet: "Mainboard and SME IPOs, how listings performed, and what to check before you apply.", url: "/ipo", kind: "Page" },
  { title: "Academy", snippet: "Learn to invest by level, ask the analyst, and self-check your understanding.", url: "/academy", kind: "Page" },
  { title: "Markets Glossary", snippet: "Plain-English definitions of the terms every Indian investor should know.", url: "/glossary", kind: "Page" },
  { title: "Coverage", snippet: "The stocks Bazaar Brief tracks, with live prices and a neutral what-to-watch note.", url: "/coverage", kind: "Page" },
  { title: "Issues archive", snippet: "Every past issue of Bazaar Brief.", url: "/issues", kind: "Page" },
];

// Builds the full client-side search index from all static content. Called
// once, server-side, and serialized into the search page.
export function buildSearchIndex(): SearchDoc[] {
  const docs: SearchDoc[] = [...STATIC_PAGES];

  for (const issue of getAllIssues()) {
    docs.push({
      title: issue.title,
      snippet: snippet(issue.summary || issue.content),
      url: `/issues/${issue.slug}`,
      kind: "Issue",
    });
  }

  for (const term of glossary) {
    docs.push({
      title: term.term,
      snippet: snippet(term.def),
      url: `/glossary/${slugifyTerm(term.term)}`,
      kind: "Glossary",
    });
  }

  for (const stock of coveredStocks) {
    docs.push({
      title: `${stock.name} (${stock.symbol})`,
      snippet: `${stock.sector} · ${snippet(stock.thesis)}`,
      url: "/coverage",
      kind: "Stock",
    });
  }

  for (const level of learnLevels) {
    for (const q of level.questions) {
      docs.push({
        title: q,
        snippet: `${level.level} · self-check`,
        url: `/academy#${level.id}`,
        kind: "Learn",
      });
    }
  }

  return docs;
}
