// Two renewable views MERIT can't give directly:
//
//  1. An ESTIMATED live solar-vs-wind split. MERIT reports "renewable" as one
//     number. But solar is zero after dark, so the night-time floor of the
//     renewable curve is essentially wind (+ small hydro-RE/biomass); today's
//     reading above that floor is the solar contribution. It's an inference from
//     the daily shape, not a metered split — and labelled that way.
//
//  2. A solar & wind OUTLOOK from the weather forecast (open-meteo): how strong
//     the sun and wind will be over the coming days, which is what actually
//     moves renewable output.

import { getGridSnapshot } from "@/lib/grid-live";
import { getRecentSamples } from "@/lib/samples";

const istHour = (iso: string): number =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date(iso))) % 24;

export type ReSplit = {
  renewableMw: number;
  solarMw: number;
  windOtherMw: number;
  solarSharePct: number; // solar ÷ renewable
  fetchedAt: string;
};

export async function getEstimatedReSplit(): Promise<ReSplit | null> {
  const [snapshot, samples] = await Promise.all([getGridSnapshot(), getRecentSamples(2)]);
  if (!snapshot) return null;

  // Night-time floor of renewables over the last two days ≈ non-solar RE.
  const nightVals = samples
    .filter((s) => { const h = istHour(s.t); return h >= 21 || h <= 5; })
    .map((s) => s.mix.renewable ?? 0)
    .filter((v) => v > 0);
  const baseline = nightVals.length ? Math.min(...nightVals) : Math.min(snapshot.mix.renewable, snapshot.mix.renewable);

  const renewableMw = snapshot.mix.renewable;
  const solarMw = Math.max(0, renewableMw - baseline);
  const windOtherMw = renewableMw - solarMw;
  return {
    renewableMw,
    solarMw,
    windOtherMw,
    solarSharePct: renewableMw > 0 ? (solarMw / renewableMw) * 100 : 0,
    fetchedAt: snapshot.fetchedAt,
  };
}

// --- Solar & wind outlook ---

const OUTLOOK_CITIES = [
  { lat: 28.61, lng: 77.21 }, // Delhi
  { lat: 26.91, lng: 75.79 }, // Jaipur (solar belt)
  { lat: 23.03, lng: 72.58 }, // Ahmedabad (solar/wind)
  { lat: 17.38, lng: 78.48 }, // Hyderabad
  { lat: 13.08, lng: 80.27 }, // Chennai (wind)
  { lat: 22.57, lng: 88.36 }, // Kolkata
];

export type Strength = "strong" | "moderate" | "weak";
export type ReOutlookDay = { date: string; radiationMj: number; windKmh: number; solar: Strength; wind: Strength };

const solarStrength = (mj: number): Strength => (mj >= 20 ? "strong" : mj >= 14 ? "moderate" : "weak");
const windStrength = (kmh: number): Strength => (kmh >= 25 ? "strong" : kmh >= 15 ? "moderate" : "weak");

export async function getReOutlook(): Promise<ReOutlookDay[] | null> {
  const lats = OUTLOOK_CITIES.map((c) => c.lat).join(",");
  const lngs = OUTLOOK_CITIES.map((c) => c.lng).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
    `&daily=shortwave_radiation_sum,wind_speed_10m_max&timezone=Asia%2FKolkata&forecast_days=4`;
  try {
    const res = await fetch(url, { next: { revalidate: 10_800 }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as
      | { daily?: { time: string[]; shortwave_radiation_sum: (number | null)[]; wind_speed_10m_max: (number | null)[] } }
      | Array<{ daily?: { time: string[]; shortwave_radiation_sum: (number | null)[]; wind_speed_10m_max: (number | null)[] } }>;
    const cities = Array.isArray(data) ? data : [data];
    const dates = cities[0]?.daily?.time ?? [];
    return dates.map((date, i) => {
      const rad = cities.map((c) => c.daily?.shortwave_radiation_sum?.[i]).filter((v): v is number => v != null);
      const wind = cities.map((c) => c.daily?.wind_speed_10m_max?.[i]).filter((v): v is number => v != null);
      const radiationMj = rad.reduce((s, v) => s + v, 0) / (rad.length || 1);
      const windKmh = wind.reduce((s, v) => s + v, 0) / (wind.length || 1);
      return { date, radiationMj, windKmh, solar: solarStrength(radiationMj), wind: windStrength(windKmh) };
    });
  } catch {
    return null;
  }
}
