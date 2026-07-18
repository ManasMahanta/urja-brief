// Data-health layer — the honesty brand made systematic. Checks each live source
// is actually responding, how fresh the 15-minute sampler is (the thing that was
// silently dead), and how old every dated reference dataset has gone. If a source
// is down or a dataset is stale, this says so plainly instead of letting a number
// quietly rot.

import { getGridSnapshot } from "@/lib/grid-live";
import { getRecentSamples } from "@/lib/samples";
import { glmConfigured } from "@/lib/glm";
import tariffs from "@/data/tariffs.json";
import fuelPrices from "@/data/fuel-prices.json";
import reCapacity from "@/data/re-capacity.json";
import petroleum from "@/data/petroleum.json";

export type SourceHealth = { name: string; ok: boolean; detail: string };
export type SamplerHealth = { ok: boolean; lastSampleAgo: string | null; todayCount: number; detail: string };
export type DatasetAge = { name: string; asOf: string; ageMonths: number; stale: boolean };

const istTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

function agoLabel(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  return `${Math.round(hrs / 24)} day(s) ago`;
}

// Live sources — each check is isolated so one failure can't break the page.
export async function getLiveSources(): Promise<SourceHealth[]> {
  const checks: Array<Promise<SourceHealth>> = [
    getGridSnapshot()
      .then((s) => ({ name: "Grid (MERIT dashboard)", ok: !!s, detail: s ? `fetched ${istTime(s.fetchedAt)} IST` : "unreachable right now" }))
      .catch(() => ({ name: "Grid (MERIT dashboard)", ok: false, detail: "error" })),
    import("@/lib/coal")
      .then((m) => m.getCoalStock())
      .then((c) => ({ name: "Coal report (CEA / NPP)", ok: !!c, detail: c ? `as on ${c.asOn}` : "unreachable / not published yet" }))
      .catch(() => ({ name: "Coal report (CEA / NPP)", ok: false, detail: "error" })),
    import("@/lib/renewables")
      .then((m) => m.getReOutlook())
      .then((o) => ({ name: "Weather (open-meteo)", ok: !!o?.length, detail: o?.length ? "responding" : "unreachable" }))
      .catch(() => ({ name: "Weather (open-meteo)", ok: false, detail: "error" })),
    Promise.resolve({ name: "AI explainers (GLM)", ok: glmConfigured(), detail: glmConfigured() ? "configured" : "not configured" }),
  ];
  return Promise.all(checks);
}

export async function getSamplerHealth(): Promise<SamplerHealth> {
  try {
    const recent = await getRecentSamples(2);
    if (!recent.length) return { ok: false, lastSampleAgo: null, todayCount: 0, detail: "no samples yet" };
    const last = recent[recent.length - 1];
    const ageMs = Date.now() - Date.parse(last.t);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const todayCount = recent.filter((s) => s.t.slice(0, 10) === today).length;
    // Cadence is ~hourly (GitHub throttles the 15-min schedule); flag if a gap
    // exceeds three hours.
    const ok = ageMs < 3 * 3_600_000;
    return { ok, lastSampleAgo: agoLabel(ageMs), todayCount, detail: ok ? "sampling normally" : "sampler may be stalled" };
  } catch {
    return { ok: false, lastSampleAgo: null, todayCount: 0, detail: "error reading samples" };
  }
}

// Months between an "as of" string (YYYY, YYYY-MM, or YYYY-MM-DD) and now.
function monthsSince(asOf: string): number {
  const parts = asOf.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1] ?? "1");
  const d = Number(parts[2] ?? "1");
  const then = new Date(Date.UTC(y, m - 1, d));
  return Math.max(0, Math.round((Date.now() - then.getTime()) / (30.44 * 86_400_000)));
}

export function getReferenceAges(): DatasetAge[] {
  const datasets: Array<{ name: string; asOf: string; staleAfter: number }> = [
    { name: "Electricity tariffs", asOf: tariffs.asOf, staleAfter: 12 },
    { name: "Fuel & CNG prices", asOf: fuelPrices.asOf, staleAfter: 3 },
    { name: "Renewable capacity (MNRE)", asOf: reCapacity.asOf, staleAfter: 6 },
    { name: "Petroleum reference", asOf: petroleum.asOf, staleAfter: 3 },
  ];
  return datasets.map((d) => {
    const ageMonths = monthsSince(d.asOf);
    return { name: d.name, asOf: d.asOf, ageMonths, stale: ageMonths > d.staleAfter };
  });
}
