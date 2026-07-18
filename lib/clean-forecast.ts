// Clean-hour forecast: turns the accumulated 15-minute history into a typical
// carbon-intensity-by-hour profile, so the carbon desk can say not just "now is
// clean" but "the cleanest hours are usually 12–3pm — shift your heavy loads
// there." It sharpens as the sampler accumulates days; with thin history it
// says so honestly rather than inventing a curve.

import { getRecentSamples } from "@/lib/samples";
import { carbonIntensity } from "@/lib/carbon";

export type HourStat = { hour: number; avgGco2: number; samples: number };

export type CleanForecast = {
  hours: HourStat[]; // only hours that have samples, 0..23
  min: number;
  max: number;
  cleanest: HourStat; // typically-cleanest single hour
  dirtiest: HourStat;
  bestWindow: { startHour: number; endHour: number }; // contiguous 3h cleanest block
  daysCovered: number;
  totalSamples: number;
  todayRemaining: HourStat[]; // upcoming hours today that are in the cleaner half
};

const istHour = (iso: string): number =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date(iso))) % 24;

export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${period}`;
}

export async function getCleanForecast(days = 7): Promise<CleanForecast | null> {
  const samples = await getRecentSamples(days);
  if (samples.length < 12) return null; // too thin to claim a "typical" shape

  // Bucket carbon intensity by IST hour of day.
  const sum = new Array(24).fill(0);
  const count = new Array(24).fill(0);
  const dayKeys = new Set<string>();
  for (const sample of samples) {
    const intensity = carbonIntensity(sample.mix);
    if (intensity === null) continue;
    const hour = istHour(sample.t);
    sum[hour] += intensity;
    count[hour] += 1;
    dayKeys.add(sample.t.slice(0, 10));
  }

  const hours: HourStat[] = [];
  for (let h = 0; h < 24; h++) {
    if (count[h] > 0) hours.push({ hour: h, avgGco2: sum[h] / count[h], samples: count[h] });
  }
  if (hours.length < 3) return null;

  const byClean = [...hours].sort((a, b) => a.avgGco2 - b.avgGco2);
  const cleanest = byClean[0];
  const dirtiest = byClean[byClean.length - 1];
  const min = cleanest.avgGco2;
  const max = dirtiest.avgGco2;

  // Cleanest contiguous 3-hour block among hours that actually have data.
  const withData = new Set(hours.map((h) => h.hour));
  const avgAt = (h: number) => sum[h] / count[h];
  let best = { startHour: cleanest.hour, endHour: cleanest.hour, avg: cleanest.avgGco2 };
  for (let start = 0; start < 24; start++) {
    const block = [start, start + 1, start + 2].map((h) => h % 24);
    if (!block.every((h) => withData.has(h))) continue;
    const avg = block.reduce((s, h) => s + avgAt(h), 0) / 3;
    if (avg < best.avg) best = { startHour: block[0], endHour: (block[0] + 3) % 24, avg };
  }

  // Upcoming hours today that sit in the cleaner half of the typical curve.
  const nowHour = istHour(new Date().toISOString());
  const median = byClean[Math.floor(byClean.length / 2)].avgGco2;
  const todayRemaining = hours
    .filter((h) => h.hour > nowHour && h.avgGco2 <= median)
    .sort((a, b) => a.hour - b.hour);

  return {
    hours: hours.sort((a, b) => a.hour - b.hour),
    min,
    max,
    cleanest,
    dirtiest,
    bestWindow: { startHour: best.startHour, endHour: best.endHour },
    daysCovered: dayKeys.size,
    totalSamples: samples.length,
    todayRemaining,
  };
}
