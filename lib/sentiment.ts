// News sentiment engine.
//
// Real, timestamped, attributable coverage — not the model's prior knowledge.
// Headlines come from Google News (rich Indian coverage: Reuters, Moneycontrol,
// NDTV, BusinessLine…), then the LLM scores each one and we aggregate.
//
// Deliberately NOT called "social" sentiment: this is press coverage. X /
// Reddit / Telegram scoring needs a paid social provider, and labelling news
// tone as social would be dishonest.
//
// The daily trend is derived from our own scored headlines rather than a second
// upstream (GDELT's tone API is free but aggressively IP-throttled), which
// keeps this to one dependency and makes every trend point traceable to an
// article the reader can click.

import { unstable_cache } from "next/cache";
import { callGLMRetry, glmConfigured } from "@/lib/glm";

export type ScoredHeadline = {
  title: string;
  source: string;
  url: string;
  date: string; // ISO
  score: number; // -100..100
  why: string;
};

export type TrendPoint = { date: string; score: number; count: number };

export type SentimentRead = {
  score: number; // 0..100 composite
  overall: "Bullish" | "Neutral" | "Bearish";
  headlines: ScoredHeadline[];
  trend: TrendPoint[];
  outlets: number;
  total: number;
};

const FEED_TTL = 21_600; // 6h — news moves faster than fundamentals
const MAX_HEADLINES = 24;

/* --- Google News RSS --------------------------------------------------- */

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " ", "&#39;": "'",
};

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;|&#39;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .trim();
}

/** Strip the corporate suffix so the phrase search matches how press writes it. */
function searchName(name: string): string {
  return name
    .replace(/\s+(Limited|Ltd\.?|Inc\.?|Corporation|Corp\.?|Company|Co\.?|PLC|S\.A\.?|AG|N\.V\.?)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

type RawItem = { title: string; source: string; url: string; date: string };

/** Parse Google News RSS. The feed's shape is fixed and well-formed, so a
 *  targeted parse beats pulling in an XML dependency. */
function parseFeed(xml: string): RawItem[] {
  const out: RawItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = decode(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const url = decode(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    const source = decode(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "");
    if (!title || !url) continue;
    const d = new Date(pub);
    if (Number.isNaN(d.getTime())) continue;
    // Google appends " - Source" to every title; we render the source separately.
    const clean = source && title.endsWith(` - ${source}`) ? title.slice(0, -(source.length + 3)) : title;
    out.push({ title: clean.trim(), source: source || "News", url, date: d.toISOString() });
  }
  return out;
}

async function fetchNews(name: string): Promise<RawItem[]> {
  const q = encodeURIComponent(`"${searchName(name)}" when:7d`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BazaarBrief/1.0)" },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const items = parseFeed(await res.text());
    // Dedupe syndicated copies of the same story.
    const seen = new Set<string>();
    const uniq: RawItem[] = [];
    for (const it of items) {
      const key = it.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").slice(0, 8).join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(it);
    }
    return uniq
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, MAX_HEADLINES);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/* --- Scoring ----------------------------------------------------------- */

const SYS =
  "You are an equity news analyst. You score how each headline reads for a company's " +
  "business outlook. You are educational and objective: you never give buy/sell advice " +
  "and never predict prices. Reply with JSON only.";

async function scoreHeadlines(name: string, items: RawItem[]): Promise<Map<number, { s: number; w: string }>> {
  const list = items.map((h, i) => `${i}. ${h.title}`).join("\n");
  const user =
    `Company: ${name}\n\nScore each headline for how it reads for this company's business outlook.\n` +
    `-100 = very negative, 0 = neutral/irrelevant, +100 = very positive.\n` +
    `"w" = why, max 6 words, factual.\n\nHeadlines:\n${list}\n\n` +
    `JSON only: {"scores":[{"i":0,"s":40,"w":"large multi-year AI deal"}]}`;

  const reply = await callGLMRetry(SYS, user, 2000);
  if (!reply) throw new Error("scoring unavailable");

  const json = reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as { scores?: { i: number; s: number; w?: string }[] };
  const map = new Map<number, { s: number; w: string }>();
  for (const r of parsed.scores ?? []) {
    if (typeof r?.i !== "number" || typeof r?.s !== "number") continue;
    map.set(r.i, { s: Math.max(-100, Math.min(100, Math.round(r.s))), w: (r.w ?? "").trim() });
  }
  if (map.size === 0) throw new Error("no scores");
  return map;
}

/* --- Aggregation ------------------------------------------------------- */

/** Newer coverage carries more weight — 7-day half-life. */
function weight(iso: string): number {
  const days = (Date.now() - +new Date(iso)) / 86_400_000;
  return Math.pow(0.5, Math.max(days, 0) / 7);
}

function aggregate(scored: ScoredHeadline[]): Pick<SentimentRead, "score" | "overall" | "trend" | "outlets"> {
  let num = 0;
  let den = 0;
  for (const h of scored) {
    const w = weight(h.date);
    num += h.score * w;
    den += w;
  }
  const mean = den > 0 ? num / den : 0;
  // -100..100 → 0..100, damped: news rarely justifies the extremes.
  const score = Math.round(Math.max(0, Math.min(100, 50 + mean * 0.4)));

  const byDay = new Map<string, number[]>();
  for (const h of scored) {
    const day = h.date.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), h.score]);
  }
  const trend: TrendPoint[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, xs]) => ({
      date,
      score: Math.round(xs.reduce((s, x) => s + x, 0) / xs.length),
      count: xs.length,
    }));

  return {
    score,
    overall: score >= 60 ? "Bullish" : score <= 40 ? "Bearish" : "Neutral",
    trend,
    outlets: new Set(scored.map((h) => h.source)).size,
  };
}

/* --- Public API -------------------------------------------------------- */

// Keyed by symbol+name. Throws on failure so a bad fetch is never cached.
const cachedSentiment = unstable_cache(
  async (_symbol: string, name: string): Promise<SentimentRead> => {
    if (!glmConfigured()) throw new Error("no llm");
    const items = await fetchNews(name);
    if (items.length === 0) throw new Error("no news");

    const scores = await scoreHeadlines(name, items);
    const headlines: ScoredHeadline[] = items
      .map((h, i) => {
        const s = scores.get(i);
        return s ? { ...h, score: s.s, why: s.w } : null;
      })
      .filter((h): h is ScoredHeadline => h !== null);
    if (headlines.length === 0) throw new Error("no scored headlines");

    return { ...aggregate(headlines), headlines, total: headlines.length };
  },
  ["stock-news-sentiment"],
  { revalidate: FEED_TTL, tags: ["stock-sentiment"] },
);

/** Real news sentiment for a company. Null when unavailable — callers degrade. */
export async function getNewsSentiment(symbol: string, name: string): Promise<SentimentRead | null> {
  return cachedSentiment(symbol, name).catch(() => null);
}
