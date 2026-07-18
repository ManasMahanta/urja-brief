// Weather-driven demand. Temperature is the biggest short-run driver of India's
// electricity demand — air-conditioning and pumping load rise with the heat. We
// build a demand-weighted national daily-max-temperature series from a handful
// of big load centres (open-meteo, free, no key), align its recent history with
// our own observed daily peaks, and — if the relationship is clear enough —
// project the coming days' peak demand from the temperature forecast.

import { getRecentRollups } from "@/lib/samples";

// Major demand centres with a rough weight (relative share of national load).
const CITIES: Array<{ name: string; lat: number; lng: number; w: number }> = [
  { name: "Delhi", lat: 28.61, lng: 77.21, w: 1.0 },
  { name: "Mumbai", lat: 19.07, lng: 72.87, w: 1.0 },
  { name: "Kolkata", lat: 22.57, lng: 88.36, w: 0.7 },
  { name: "Chennai", lat: 13.08, lng: 80.27, w: 0.7 },
  { name: "Bengaluru", lat: 12.97, lng: 77.59, w: 0.7 },
  { name: "Hyderabad", lat: 17.38, lng: 78.48, w: 0.7 },
  { name: "Ahmedabad", lat: 23.03, lng: 72.58, w: 0.6 },
  { name: "Lucknow", lat: 26.85, lng: 80.95, w: 0.9 },
  { name: "Jaipur", lat: 26.91, lng: 75.79, w: 0.5 },
  { name: "Nagpur", lat: 21.15, lng: 79.09, w: 0.5 },
];

export type TempDay = { date: string; tempC: number };

export type WeatherDemand = {
  series: TempDay[]; // demand-weighted national daily max, past + forecast
  forecast: Array<{ date: string; tempC: number; projectedPeakMw: number | null }>;
  todayTempC: number | null;
  slopeMwPerC: number | null; // demand sensitivity, if establishable
  pairs: number; // temp/demand day-pairs used for the fit
};

type CityDaily = { daily?: { time: string[]; temperature_2m_max: (number | null)[] } };

// One open-meteo call for all cities, 10 past days + 4 forecast days.
async function fetchWeightedSeries(): Promise<TempDay[]> {
  const lats = CITIES.map((c) => c.lat).join(",");
  const lngs = CITIES.map((c) => c.lng).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
    `&daily=temperature_2m_max&timezone=Asia%2FKolkata&past_days=10&forecast_days=4`;
  const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];
  const data = (await res.json()) as CityDaily | CityDaily[];
  const cities = Array.isArray(data) ? data : [data];

  const sum = new Map<string, number>();
  const weight = new Map<string, number>();
  cities.forEach((city, i) => {
    const w = CITIES[i]?.w ?? 0.5;
    const times = city.daily?.time ?? [];
    const temps = city.daily?.temperature_2m_max ?? [];
    times.forEach((date, j) => {
      const t = temps[j];
      if (t === null || t === undefined) return;
      sum.set(date, (sum.get(date) ?? 0) + t * w);
      weight.set(date, (weight.get(date) ?? 0) + w);
    });
  });

  return [...sum.keys()]
    .sort()
    .map((date) => ({ date, tempC: sum.get(date)! / weight.get(date)! }));
}

// Least-squares slope + intercept of demand (MW) on temperature (°C).
function linreg(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 5) return null;
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  // Demand rises with heat; a non-positive slope means the signal isn't there yet.
  if (slope <= 0) return null;
  return { slope, intercept };
}

export async function getWeatherDemand(): Promise<WeatherDemand | null> {
  const [series, rollups] = await Promise.all([fetchWeightedSeries(), getRecentRollups()]);
  if (!series.length) return null;

  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const tempByDate = new Map(series.map((d) => [d.date, d.tempC]));

  // Pair each past day's weighted temp with our observed peak demand.
  const points = rollups
    .filter((r) => tempByDate.has(r.date))
    .map((r) => ({ x: tempByDate.get(r.date)!, y: r.peakMw }));
  const fit = linreg(points);

  const forecast = series
    .filter((d) => d.date >= todayIso)
    .slice(0, 4)
    .map((d) => ({
      date: d.date,
      tempC: d.tempC,
      projectedPeakMw: fit ? Math.round(fit.intercept + fit.slope * d.tempC) : null,
    }));

  return {
    series,
    forecast,
    todayTempC: tempByDate.get(todayIso) ?? null,
    slopeMwPerC: fit ? fit.slope : null,
    pairs: points.length,
  };
}
