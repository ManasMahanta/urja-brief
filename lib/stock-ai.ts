// ============================================================================
// Stock "dissection" engine.
//
// Combines the REAL, keyless market data we can fetch (price action, ranges,
// volume, intraday spark) with a single structured GLM call that produces the
// qualitative AI analysis (briefing, thesis, risks, sentiment, catalysts).
//
// Everything the AI returns is *analysis/opinion*, clearly badged in the UI and
// never presented as sourced fact — the model is explicitly instructed not to
// invent precise financials. Fundamentals that need a paid provider are shown
// as labelled placeholders, not fabricated.
// ============================================================================

import { unstable_cache } from "next/cache";
import { getStockQuote, type Quote } from "@/lib/market";
import { callGLMRetry, glmConfigured } from "@/lib/glm";
import {
  getFundamentals,
  getIndicators,
  getPeers,
  getExtras,
  type Fundamentals,
  type Indicators,
  type PeerRow,
  type Extras,
} from "@/lib/yahoo-fundamentals";
import { getNewsSentiment, type SentimentRead } from "@/lib/sentiment";

export type Rating = "Buy" | "Accumulate" | "Hold" | "Reduce" | "Avoid";
export type Level = "High" | "Medium" | "Low";

export type RiskItem = {
  risk: string;
  probability: Level;
  impact: Level;
  mitigation: string;
};
export type Catalyst = { when: string; event: string; impact: Level };

export type Dissection = {
  summary: string;
  overview: string;
  sector: string;
  industry: string;
  rating: Rating;
  confidence: number;
  fairValue: string;
  briefing: {
    today: string;
    week: string;
    month: string;
    bull: string[];
    bear: string[];
    hiddenRisks: string[];
    hiddenOpportunities: string[];
    watchNext: string[];
    recommendation: string;
  };
  thesis: {
    bull: string;
    base: string;
    bear: string;
    horizon: string;
    cagr: string;
    entry: string;
    exit: string;
  };
  risks: RiskItem[];
  sentiment: {
    overall: "Bullish" | "Neutral" | "Bearish";
    score: number; // 0..100
    institutional: string;
    retail: string;
    news: string;
    note: string;
  };
  catalysts: Catalyst[];
  moat: string;
  supplyChain: { upstream: string[]; downstream: string[] };
  mAndA: string[];
};

export type Technicals = {
  rangePosition: number; // 0..100 within the 52-week range
  dayPosition: number; // 0..100 within today's range
  support: number | null;
  resistance: number | null;
  distToHigh: number | null; // % below 52w high
  distToLow: number | null; // % above 52w low
  trend: "up" | "down" | "flat";
  volume: number | null;
};

export function computeTechnicals(q: Quote): Technicals {
  const hi = q.week52High;
  const lo = q.week52Low;
  const price = q.price;
  const rangePosition =
    hi && lo && hi > lo ? Math.round(((price - lo) / (hi - lo)) * 100) : 50;
  const dHi = q.dayHigh;
  const dLo = q.dayLow;
  const dayPosition =
    dHi && dLo && dHi > dLo ? Math.round(((price - dLo) / (dHi - dLo)) * 100) : 50;
  const spark = q.spark ?? [];
  const trend =
    spark.length > 1
      ? spark[spark.length - 1] > spark[0]
        ? "up"
        : spark[spark.length - 1] < spark[0]
          ? "down"
          : "flat"
      : q.changePercent > 0
        ? "up"
        : q.changePercent < 0
          ? "down"
          : "flat";
  return {
    rangePosition,
    dayPosition,
    support: dLo ?? lo ?? null,
    resistance: dHi ?? hi ?? null,
    distToHigh: hi ? ((hi - price) / hi) * 100 : null,
    distToLow: lo ? ((price - lo) / lo) * 100 : null,
    trend,
    volume: q.volume ?? null,
  };
}

// A safe fallback so the page renders even if GLM is unconfigured/unavailable.
function fallbackDissection(name: string): Dissection {
  return {
    summary: `${name} — AI analysis is unavailable right now; showing live market data only.`,
    overview:
      "Connect the AI engine (ZAI_API_KEY) to generate a full qualitative dissection of this company.",
    sector: "—",
    industry: "—",
    rating: "Hold",
    confidence: 0,
    fairValue: "AI valuation view unavailable.",
    briefing: {
      today: "—",
      week: "—",
      month: "—",
      bull: [],
      bear: [],
      hiddenRisks: [],
      hiddenOpportunities: [],
      watchNext: [],
      recommendation: "AI briefing unavailable.",
    },
    thesis: { bull: "—", base: "—", bear: "—", horizon: "—", cagr: "—", entry: "—", exit: "—" },
    risks: [],
    sentiment: { overall: "Neutral", score: 50, institutional: "—", retail: "—", news: "—", note: "—" },
    catalysts: [],
    moat: "—",
    supplyChain: { upstream: [], downstream: [] },
    mAndA: [],
  };
}

function stripFences(s: string): string {
  return s
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/** Parse model output as JSON, salvaging the {...} block if it's wrapped in prose. */
function parseModelJson(reply: string): unknown {
  const text = stripFences(reply);
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)); // may still throw — caller catches
    }
    throw new Error("no JSON object found");
  }
}

// Coerce arbitrary parsed JSON into our shape, filling gaps defensively.
function coerce(raw: unknown, name: string): Dissection {
  const fb = fallbackDissection(name);
  if (!raw || typeof raw !== "object") return fb;
  const o = raw as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : [];
  const str = (v: unknown, d: string) => (typeof v === "string" && v.trim() ? v.trim() : d);
  const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
  const b = (o.briefing ?? {}) as Record<string, unknown>;
  const t = (o.thesis ?? {}) as Record<string, unknown>;
  const s = (o.sentiment ?? {}) as Record<string, unknown>;
  const lvl = (v: unknown): Level =>
    v === "High" || v === "Medium" || v === "Low" ? v : "Medium";
  return {
    summary: str(o.summary, fb.summary),
    overview: str(o.overview, fb.overview),
    sector: str(o.sector, "—"),
    industry: str(o.industry, "—"),
    rating: (["Buy", "Accumulate", "Hold", "Reduce", "Avoid"].includes(o.rating as string)
      ? o.rating
      : "Hold") as Rating,
    confidence: Math.max(0, Math.min(100, num(o.confidence, 50))),
    fairValue: str(o.fairValue, fb.fairValue),
    briefing: {
      today: str(b.today, "—"),
      week: str(b.week, "—"),
      month: str(b.month, "—"),
      bull: arr(b.bull),
      bear: arr(b.bear),
      hiddenRisks: arr(b.hiddenRisks),
      hiddenOpportunities: arr(b.hiddenOpportunities),
      watchNext: arr(b.watchNext),
      recommendation: str(b.recommendation, "—"),
    },
    thesis: {
      bull: str(t.bull, "—"),
      base: str(t.base, "—"),
      bear: str(t.bear, "—"),
      horizon: str(t.horizon, "—"),
      cagr: str(t.cagr, "—"),
      entry: str(t.entry, "—"),
      exit: str(t.exit, "—"),
    },
    risks: Array.isArray(o.risks)
      ? (o.risks as Record<string, unknown>[])
          .slice(0, 6)
          .map((r) => ({
            risk: str(r.risk, "—"),
            probability: lvl(r.probability),
            impact: lvl(r.impact),
            mitigation: str(r.mitigation, "—"),
          }))
      : [],
    sentiment: {
      overall: (["Bullish", "Neutral", "Bearish"].includes(s.overall as string)
        ? s.overall
        : "Neutral") as "Bullish" | "Neutral" | "Bearish",
      score: Math.max(0, Math.min(100, num(s.score, 50))),
      institutional: str(s.institutional, "—"),
      retail: str(s.retail, "—"),
      news: str(s.news, "—"),
      note: str(s.note, "—"),
    },
    catalysts: Array.isArray(o.catalysts)
      ? (o.catalysts as Record<string, unknown>[])
          .slice(0, 6)
          .map((c) => ({ when: str(c.when, "—"), event: str(c.event, "—"), impact: lvl(c.impact) }))
      : [],
    moat: str(o.moat, "—"),
    supplyChain: {
      upstream: arr((o.supplyChain as Record<string, unknown> | undefined)?.upstream),
      downstream: arr((o.supplyChain as Record<string, unknown> | undefined)?.downstream),
    },
    mAndA: arr(o.mAndA),
  };
}

const SYSTEM = `You are the lead equity analyst on an AI market-intelligence desk covering primarily Indian (NSE/BSE) and major global stocks. You produce a structured "dissection" of a company for an educated retail/professional audience.

Hard rules:
- You are NOT a SEBI-registered adviser. Frame everything as educational analysis/opinion.
- You MAY cite the real figures provided in the context (market cap, P/E, ROE, margins, growth, ownership). DO NOT invent OTHER precise figures beyond those — reason qualitatively for anything not given.
- Use the live price context provided to reason about valuation/positioning qualitatively (e.g. "trading in the upper third of its 1-year range").
- Be specific and non-generic where you can; concise.
- Respond with ONLY a single valid JSON object, no markdown, no commentary.`;

export async function generateDissection(
  quote: Quote,
  f?: Fundamentals | null,
): Promise<{ data: Dissection; aiLive: boolean }> {
  if (!glmConfigured()) return { data: fallbackDissection(quote.name), aiLive: false };

  const ctx = [
    `Company: ${quote.name} (${quote.symbol})`,
    `Live price: ${quote.price} ${quote.currency}`,
    `Today: ${quote.changePercent.toFixed(2)}%`,
    quote.week52High && `52-week high: ${quote.week52High}`,
    quote.week52Low && `52-week low: ${quote.week52Low}`,
    quote.dayHigh && `Day range: ${quote.dayLow}–${quote.dayHigh}`,
    quote.volume && `Volume: ${quote.volume}`,
    // Real fundamentals (from Yahoo) — let the model reason over actual figures.
    f?.sector && `Sector: ${f.sector} / ${f.industry ?? ""}`,
    f?.marketCap && `Market cap: ${f.marketCap}`,
    f?.trailingPE && `P/E: ${f.trailingPE}`,
    f?.eps && `EPS: ${f.eps}`,
    f?.roe && `ROE: ${f.roe}`,
    f?.profitMargin && `Profit margin: ${f.profitMargin}`,
    f?.revenueGrowth && `Revenue growth (YoY): ${f.revenueGrowth}`,
    f?.debtToEquity && `Debt/Equity: ${f.debtToEquity}`,
    f?.dividendYield && `Dividend yield: ${f.dividendYield}`,
    f?.recommendation && `Analyst consensus: ${f.recommendation}`,
    f?.institutionsPct && `Institutional ownership: ${f.institutionsPct}`,
  ]
    .filter(Boolean)
    .join("\n");

  const user = `Dissect this company. Live market context:
${ctx}

Return JSON with EXACTLY these keys:
{
 "summary": "one incisive sentence on what's happening and why",
 "overview": "2-3 sentences: what the business does and how it makes money",
 "sector": "sector", "industry": "industry",
 "rating": "Buy|Accumulate|Hold|Reduce|Avoid",
 "confidence": 0-100,
 "fairValue": "one sentence qualitative valuation view vs the current price/range",
 "briefing": {
   "today":"", "week":"", "month":"",
   "bull":["",""], "bear":["",""],
   "hiddenRisks":[""], "hiddenOpportunities":[""],
   "watchNext":["",""], "recommendation":"one sentence"
 },
 "thesis": {"bull":"","base":"","bear":"","horizon":"","cagr":"approx range","entry":"qualitative","exit":"qualitative"},
 "risks":[{"risk":"","probability":"High|Medium|Low","impact":"High|Medium|Low","mitigation":""}],
 "sentiment":{"overall":"Bullish|Neutral|Bearish","score":0-100,"institutional":"","retail":"","news":"","note":""},
 "catalysts":[{"when":"","event":"","impact":"High|Medium|Low"}],
 "moat":"one sentence on the competitive moat / durable advantage",
 "supplyChain":{"upstream":["key inputs/suppliers"],"downstream":["key customers/markets"]},
 "mAndA":["notable recent acquisitions, divestitures, JVs or strategic moves, if any"]
}`;

  try {
    const reply = await callGLMRetry(SYSTEM, user, 3000);
    if (!reply) return { data: fallbackDissection(quote.name), aiLive: false };
    const parsed = parseModelJson(reply);
    return { data: coerce(parsed, quote.name), aiLive: true };
  } catch {
    return { data: fallbackDissection(quote.name), aiLive: false };
  }
}

// The AI narrative is cached 4h per symbol. Keyed by SYMBOL ONLY (not the live
// price) — otherwise every price tick would bust the key and re-run the model.
// The displayed price stays fresh via the page's own revalidate; only the
// qualitative analysis is reused. Failures throw so they're never cached.
const cachedDissection = unstable_cache(
  async (symbol: string) => {
    const quote = await getStockQuote(symbol);
    if (!quote) throw new Error("no quote");
    const f = await getFundamentals(quote.symbol);
    const r = await generateDissection(quote, f);
    if (!r.aiLive) throw new Error("ai unavailable");
    return r;
  },
  ["stock-ai-dissection"],
  { revalidate: 14_400, tags: ["stock-ai"] },
);

/** Fetch the quote + real fundamentals, then run the AI dissection. */
export async function getDissection(symbol: string): Promise<{
  quote: Quote | null;
  data: Dissection;
  technicals: Technicals | null;
  fundamentals: Fundamentals | null;
  indicators: Indicators | null;
  peers: PeerRow[];
  extras: Extras;
  news: SentimentRead | null;
  aiLive: boolean;
}> {
  const emptyExtras: Extras = { earnings: [], statements: [], holders: [], currency: "INR" };
  const quote = await getStockQuote(symbol);
  if (!quote) {
    return {
      quote: null,
      data: fallbackDissection(symbol),
      technicals: null,
      fundamentals: null,
      indicators: null,
      peers: [],
      extras: emptyExtras,
      news: null,
      aiLive: false,
    };
  }
  // Real fundamentals first (the AI, indicators, and peer filter all use them).
  const fundamentals = await getFundamentals(quote.symbol);
  const [{ data, aiLive }, indicators, peers, extras, news] = await Promise.all([
    cachedDissection(quote.symbol).catch(() => ({
      data: fallbackDissection(quote.name),
      aiLive: false,
    })),
    getIndicators(quote.symbol, fundamentals?.fiftyDayAvg, fundamentals?.twoHundredDayAvg, quote.price),
    getPeers(quote.symbol, fundamentals?.sector),
    getExtras(quote.symbol, quote.currency),
    getNewsSentiment(quote.symbol, quote.name),
  ]);
  return {
    quote,
    data,
    technicals: computeTechnicals(quote),
    fundamentals,
    indicators,
    peers,
    extras,
    news,
    aiLive,
  };
}
