import { getDaySamples, istDate } from "@/lib/samples";
import { carbonIntensity } from "@/lib/carbon";

// One day's 15-minute samples as open data — JSON (default) or CSV
// (?format=csv), for anyone who wants to chart or analyse India's grid. The
// underlying files are the same repo-as-database samples the site runs on.
//
//   /api/grid/samples                 → today (IST), JSON
//   /api/grid/samples?date=2026-07-17 → that IST day, JSON
//   /api/grid/samples?date=...&format=csv → CSV download

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };
const FUELS = ["thermal", "gas", "nuclear", "hydro", "renewable", "storage", "other"] as const;

export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? istDate(0);
  const format = url.searchParams.get("format");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Pass date as YYYY-MM-DD (IST)." }, { status: 400, headers: CORS });
  }

  const samples = await getDaySamples(date);
  const rows = samples.map((s) => ({
    time: s.t,
    demandMw: Math.round(s.demandMw),
    renewableSharePct: Number(s.rePct.toFixed(2)),
    carbonIntensityGco2PerKwh: (() => {
      const v = carbonIntensity(s.mix);
      return v === null ? "" : Math.round(v);
    })(),
    ...Object.fromEntries(FUELS.map((f) => [`${f}Mw`, Math.round(s.mix[f] ?? 0)])),
  }));

  if (format === "csv") {
    const header = ["time", "demandMw", "renewableSharePct", "carbonIntensityGco2PerKwh", ...FUELS.map((f) => `${f}Mw`)];
    const body = [
      header.join(","),
      ...rows.map((r) => header.map((k) => String((r as Record<string, unknown>)[k] ?? "")).join(",")),
    ].join("\n");
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="urja-grid-${date}.csv"`,
        "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
        ...CORS,
      },
    });
  }

  return Response.json(
    {
      date,
      timezone: "Asia/Kolkata",
      source: "Ministry of Power / MERIT (meritindia.in), sampled every ~15 min by Urja Brief",
      license: "CC BY 4.0 — credit Urja Brief",
      count: rows.length,
      samples: rows,
    },
    { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=3600", ...CORS } },
  );
}
