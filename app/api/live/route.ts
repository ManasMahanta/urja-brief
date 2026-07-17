import { NextResponse } from "next/server";
import { getLiveTicker } from "@/lib/market";

// Live index/macro quotes for the homepage polling ribbon. The route runs on
// every request, but the underlying Yahoo fetch is cached ~20s, so any polling
// cadence is safe for the upstream.
export const dynamic = "force-dynamic";

export async function GET() {
  const quotes = await getLiveTicker(20);
  return NextResponse.json(
    { quotes, asOf: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
