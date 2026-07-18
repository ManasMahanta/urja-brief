// Rooftop-solar yield by city — the input the calculator needs. We pull a full
// year of daily solar radiation (open-meteo archive, free, no key) for each
// city and turn it into a specific yield (kWh generated per kW of panels per
// year), so the savings estimate is grounded in that location's real sun, not a
// national average. This is the number PM Surya Ghar shoppers actually need.

import { unstable_cache } from "next/cache";

export const SOLAR_CITIES: Array<{ name: string; lat: number; lng: number; state: string }> = [
  { name: "Delhi", lat: 28.61, lng: 77.21, state: "Delhi" },
  { name: "Mumbai", lat: 19.07, lng: 72.87, state: "Maharashtra" },
  { name: "Pune", lat: 18.52, lng: 73.86, state: "Maharashtra" },
  { name: "Bengaluru", lat: 12.97, lng: 77.59, state: "Karnataka" },
  { name: "Chennai", lat: 13.08, lng: 80.27, state: "Tamil Nadu" },
  { name: "Hyderabad", lat: 17.38, lng: 78.48, state: "Telangana" },
  { name: "Kolkata", lat: 22.57, lng: 88.36, state: "West Bengal" },
  { name: "Ahmedabad", lat: 23.03, lng: 72.58, state: "Gujarat" },
  { name: "Jaipur", lat: 26.91, lng: 75.79, state: "Rajasthan" },
  { name: "Lucknow", lat: 26.85, lng: 80.95, state: "Uttar Pradesh" },
  { name: "Bhopal", lat: 23.26, lng: 77.41, state: "Madhya Pradesh" },
  { name: "Chandigarh", lat: 30.73, lng: 76.78, state: "Punjab" },
  { name: "Kochi", lat: 9.93, lng: 76.27, state: "Kerala" },
  { name: "Patna", lat: 25.59, lng: 85.14, state: "Bihar" },
];

// Performance ratio: real systems lose ~25% to heat, dust, wiring, inverter.
const PERFORMANCE_RATIO = 0.75;

export type SolarYield = { name: string; state: string; yieldKwhPerKwYear: number };

const isoDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

async function fetchYields(): Promise<SolarYield[]> {
  // A full year ending a week ago (archive lags a few days).
  const end = isoDate(7);
  const start = isoDate(371);
  const lats = SOLAR_CITIES.map((c) => c.lat).join(",");
  const lngs = SOLAR_CITIES.map((c) => c.lng).join(",");
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lats}&longitude=${lngs}` +
    `&start_date=${start}&end_date=${end}&daily=shortwave_radiation_sum&timezone=Asia%2FKolkata`;
  try {
    const res = await fetch(url, { next: { revalidate: 604_800 }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const data = (await res.json()) as
      | { daily?: { shortwave_radiation_sum: (number | null)[] } }
      | Array<{ daily?: { shortwave_radiation_sum: (number | null)[] } }>;
    const cities = Array.isArray(data) ? data : [data];
    return cities.map((city, i) => {
      const vals = (city.daily?.shortwave_radiation_sum ?? []).filter((v): v is number => v !== null);
      // MJ/m²/day → kWh/m²/day (÷3.6) = peak sun hours; yield = PSH × 365 × PR.
      const avgMj = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      const psh = avgMj / 3.6;
      return {
        name: SOLAR_CITIES[i].name,
        state: SOLAR_CITIES[i].state,
        yieldKwhPerKwYear: Math.round(psh * 365 * PERFORMANCE_RATIO),
      };
    }).filter((y) => y.yieldKwhPerKwYear > 0);
  } catch {
    return [];
  }
}

// Cached a week — a location's annual solar resource barely moves.
export const getSolarYields = unstable_cache(fetchYields, ["urja-solar-yields"], {
  revalidate: 604_800,
  tags: ["urja-solar"],
});
