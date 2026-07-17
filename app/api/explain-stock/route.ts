import { NextResponse } from "next/server";
import { callGLM, glmConfigured } from "@/lib/glm";
import { getStockQuote, formatChange, formatPrice } from "@/lib/market";

// "Stock Deep-Dive": GLM explains a company in plain English and lists what a
// beginner should research — strictly educational, never a buy/sell call.
function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  if (!glmConfigured()) {
    return NextResponse.json(
      { error: "The Deep-Dive is not configured yet. Add ZAI_API_KEY to enable it." },
      { status: 503 },
    );
  }

  let body: { symbol?: string; level?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const symbol = clean(body.symbol, 20);
  const level = clean(body.level, 20) || "Beginner";
  if (!symbol) {
    return NextResponse.json({ error: "A stock symbol is required." }, { status: 400 });
  }

  // Attach live context if we can get it (best-effort; explainer works either way).
  const quote = await getStockQuote(symbol).catch(() => null);
  const liveLine = quote
    ? `Live: ${quote.name} at ${formatPrice(quote.price, quote.currency)} (${formatChange(quote.changePercent)} today).`
    : `No live quote available for ${symbol}.`;

  const system =
    "You are a clear, neutral financial educator writing for Indian retail " +
    "investors. Given a stock, explain it for a " + level + " audience in this " +
    "exact structure, using markdown headings:\n\n" +
    "### The business\n(2-3 sentences: what the company does and how it makes money)\n\n" +
    "### Why it moves\n(the 3-4 factors that actually drive this stock/sector)\n\n" +
    "### What to research\n(4-5 concrete things to check — e.g. specific ratios, " +
    "segments, or risks — before forming a view)\n\n" +
    "### Watch-outs\n(2-3 risks or common mistakes)\n\n" +
    "Rules: educational only. NEVER say whether to buy, sell, or hold, and never " +
    "give a price target. If you're unsure of a fact, say so rather than inventing " +
    "numbers. End with one italic line reminding the reader this is not investment advice.";

  const user = `Stock/symbol: ${symbol}. ${liveLine} Explain it for a ${level} investor.`;

  try {
    const reply = await callGLM(system, user, 1400);
    if (!reply) {
      return NextResponse.json(
        { error: "The Deep-Dive is unavailable right now. Please try again shortly." },
        { status: 502 },
      );
    }
    return NextResponse.json({ reply, quote });
  } catch (error) {
    console.error("explain-stock request failed", error);
    return NextResponse.json(
      { error: "The Deep-Dive is unavailable right now. Please try again shortly." },
      { status: 502 },
    );
  }
}
