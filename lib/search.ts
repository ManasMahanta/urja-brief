import { getAllIssues } from "@/lib/issues";
import { glossary, slugifyTerm } from "@/lib/glossary";

export type SearchDoc = {
  title: string;
  snippet: string;
  url: string;
  kind: "Issue" | "Glossary" | "Page";
};

const snippet = (text: string, max = 160) =>
  text.replace(/\s+/g, " ").trim().slice(0, max);

const STATIC_PAGES: SearchDoc[] = [
  { title: "Grid desk", snippet: "Live all-India demand, the state-wise supply picture, and the official reporting behind the grid.", url: "/grid", kind: "Page" },
  { title: "Generation desk", snippet: "India's daily generation mix — thermal, hydro, nuclear, renewables — with sources and reporting dates.", url: "/generation", kind: "Page" },
  { title: "Storage desk", snippet: "Live storage despatch, pumped hydro vs grid batteries, and how to read a BESS tender.", url: "/storage", kind: "Page" },
  { title: "Policy desk", snippet: "CEA, Ministry of Power, and MNRE reporting with practical system impact.", url: "/policy", kind: "Page" },
  { title: "Power Glossary", snippet: "Plain-English definitions of the terms behind India's power system.", url: "/glossary", kind: "Page" },
  { title: "Methodology", snippet: "How Urja Brief separates official reporting, market context, and interpretation.", url: "/methodology", kind: "Page" },
  { title: "Issues archive", snippet: "Every past issue of Urja Brief.", url: "/issues", kind: "Page" },
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

  return docs;
}
