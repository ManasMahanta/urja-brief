import { NextResponse } from "next/server";
import { getStockQuote } from "@/lib/market";

// Live single-stock quote lookup for the /markets search box. Keyless (Yahoo)
// by default; uses MARKETDATA_API_KEY if set. Returns 404 when nothing matches.
export async function POST(request: Request) {
  let symbol: unknown;
  try {
    ({ symbol } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof symbol !== "string" || !symbol.trim()) {
    return NextResponse.json(
      { error: "Enter a stock symbol, e.g. RELIANCE or TCS." },
      { status: 400 },
    );
  }

  const cleaned = symbol.trim().slice(0, 20);
  if (!/^[A-Za-z0-9&.\-]+$/.test(cleaned)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid symbol." },
      { status: 400 },
    );
  }

  try {
    const quote = await getStockQuote(cleaned);
    if (!quote) {
      return NextResponse.json(
        { error: `No live data found for "${cleaned}". Try the NSE ticker, e.g. INFY.` },
        { status: 404 },
      );
    }
    return NextResponse.json({ quote });
  } catch {
    return NextResponse.json(
      { error: "The quote service is unavailable right now. Please try again." },
      { status: 502 },
    );
  }
}
