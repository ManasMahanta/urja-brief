import { NextResponse } from "next/server";
import { searchFunds } from "@/lib/mf";

// Typeahead over AMFI's ~14k schemes. The universe is cached 12h upstream, so
// this is an in-memory filter after the first call.

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 3) return NextResponse.json({ results: [] });
  try {
    const results = await searchFunds(q, 10);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
