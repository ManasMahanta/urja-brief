import { NextResponse } from "next/server";

// Symbol search via Yahoo's keyless search endpoint. Prefers NSE/BSE listings.
export const dynamic = "force-dynamic";

type YahooQuote = { symbol?: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string };

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, next: { revalidate: 300 } },
    );
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = (await res.json()) as { quotes?: YahooQuote[] };
    const results = (data.quotes ?? [])
      .filter((x) => x.symbol && (x.quoteType === "EQUITY" || x.quoteType === "ETF" || x.quoteType === "INDEX"))
      .map((x) => ({
        symbol: String(x.symbol),
        name: x.shortname || x.longname || String(x.symbol),
        exchange: x.exchange || "",
      }))
      // Surface Indian listings first.
      .sort((a, b) => {
        const ai = /\.(NS|BO)$/.test(a.symbol) ? 0 : 1;
        const bi = /\.(NS|BO)$/.test(b.symbol) ? 0 : 1;
        return ai - bi;
      })
      .slice(0, 8);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
