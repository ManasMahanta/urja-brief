import fs from "node:fs";
import path from "node:path";

// Reads the grid samples written by scripts/sample-grid.mjs (repo-as-database:
// a GitHub Action commits data/samples/<IST date>.json every 15 minutes).
// Production reads raw.githubusercontent.com so the site sees new samples
// without a redeploy (data-only pushes skip the Vercel build — vercel.json
// ignoreCommand); local files are the fallback for dev and fresh builds.

export type GridSample = {
  t: string; // ISO timestamp
  demandMw: number;
  mix: Record<string, number>;
  rePct: number;
  // Per-state [demandMet, ownGeneration, import] MW (major states only),
  // present on samples taken after state sampling shipped.
  states?: Record<string, [number, number | null, number | null]>;
};

export type ObservedRecord = { value: number; t: string };
export type Records = Partial<{
  peakDemandMw: ObservedRecord;
  maxRePct: ObservedRecord;
  maxRenewableMw: ObservedRecord;
  maxStorageMw: ObservedRecord;
}> & { since?: string };

export type DayRollup = {
  peakMw: number;
  peakT: string;
  minMw: number;
  maxRePct: number;
  samples: number;
};

const SAMPLES_REPO = process.env.GITHUB_REPO ?? "ManasMahanta/urja-brief";

export const istDate = (offsetDays = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );

async function readDay(date: string): Promise<GridSample[]> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${SAMPLES_REPO}/main/data/samples/${date}.json`,
      { next: { revalidate: 300 } },
    );
    if (response.ok) return (await response.json()) as GridSample[];
  } catch {
    // fall through to the local copy
  }
  try {
    const file = path.join(process.cwd(), "data/samples", `${date}.json`);
    return JSON.parse(fs.readFileSync(file, "utf8")) as GridSample[];
  } catch {
    return [];
  }
}

// Today's and yesterday's IST sample series, oldest first.
export async function getLoadCurves(): Promise<{
  today: GridSample[];
  yesterday: GridSample[];
  todayDate: string;
  yesterdayDate: string;
}> {
  const [todayDate, yesterdayDate] = [istDate(0), istDate(-1)];
  const [today, yesterday] = await Promise.all([readDay(todayDate), readDay(yesterdayDate)]);
  return { today, yesterday, todayDate, yesterdayDate };
}

async function readDataFile<T>(repoPath: string, localPath: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${SAMPLES_REPO}/main/${repoPath}`,
      { next: { revalidate: 300 } },
    );
    if (response.ok) return (await response.json()) as T;
  } catch {
    // fall through to the local copy
  }
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), localPath), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export const getRecords = () =>
  readDataFile<Records>("data/records.json", "data/records.json", {});

// Current + previous IST month rollups merged, newest day first.
export async function getRecentRollups(): Promise<Array<{ date: string } & DayRollup>> {
  const months = [...new Set([istDate(0).slice(0, 7), istDate(-31).slice(0, 7)])];
  const maps = await Promise.all(
    months.map((month) =>
      readDataFile<Record<string, DayRollup>>(
        `data/rollups/${month}.json`,
        `data/rollups/${month}.json`,
        {},
      ),
    ),
  );
  return maps
    .flatMap((map) => Object.entries(map).map(([date, roll]) => ({ date, ...roll })))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// One IST day's samples (oldest first), for the open-data export endpoint.
export async function getDaySamples(date: string): Promise<GridSample[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return readDay(date);
}

// The last `days` IST days of samples, flattened oldest-first. Used to build a
// typical-by-hour profile (the clean-hour forecast). Thin until the 15-minute
// sampler runs continuously — callers must handle a short series honestly.
export async function getRecentSamples(days: number): Promise<GridSample[]> {
  const dates = Array.from({ length: Math.max(1, days) }, (_, i) => istDate(-i));
  const arrays = await Promise.all(dates.map(readDay));
  return arrays.reverse().flat();
}

// A single state's [time, demandMw] series for today, from the per-state
// readings the sampler records for major states.
export async function getStateSeries(code: string): Promise<Array<{ t: string; demandMw: number }>> {
  const { today } = await getLoadCurves();
  return today
    .filter((sample) => sample.states?.[code])
    .map((sample) => ({ t: sample.t, demandMw: sample.states![code][0] }));
}
