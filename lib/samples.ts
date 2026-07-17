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
