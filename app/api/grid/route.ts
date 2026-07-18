import { getGridSnapshot } from "@/lib/grid-live";
import { carbonIntensity } from "@/lib/carbon";

// Public, CORS-open snapshot of India's grid right now — the live end of the
// open dataset. Anyone can build on it; every consumer is a backlink. Numbers
// are the same instantaneous MERIT readings the site shows, plus the derived
// carbon intensity. Returns 503 (not a stale number) when MERIT is unreachable.

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
};

export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

export async function GET() {
  const snapshot = await getGridSnapshot();
  if (!snapshot) {
    return Response.json(
      { error: "MERIT live data is unavailable right now.", source: "meritindia.in" },
      { status: 503, headers: { "access-control-allow-origin": "*" } },
    );
  }
  const intensity = carbonIntensity(snapshot.mix);
  return Response.json(
    {
      fetchedAt: snapshot.fetchedAt,
      source: "Ministry of Power / MERIT (meritindia.in)",
      note: "Instantaneous MW readings at fetch time — not daily energy, not an official CEA record. Carbon intensity is an operational estimate.",
      demandMetMw: Math.round(snapshot.demandMetMw),
      totalGenerationMw: Math.round(snapshot.totalGenerationMw),
      renewableSharePct: Number(snapshot.renewableSharePct.toFixed(2)),
      carbonIntensityGco2PerKwh: intensity !== null ? Math.round(intensity) : null,
      mixMw: Object.fromEntries(Object.entries(snapshot.mix).map(([k, v]) => [k, Math.round(v)])),
      license: "CC BY 4.0 — credit Urja Brief",
    },
    { headers: { "content-type": "application/json; charset=utf-8", ...CORS } },
  );
}
