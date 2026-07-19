import { callGLMRetry } from "@/lib/glm";
import { getRecentRollups, istDate } from "@/lib/samples";
import type { Forecast } from "@/lib/forecasts";

// The AI-prediction engine. The model authors ONE dated, falsifiable call about
// the grid, grounded in our own observed rollups — then it lands on the public
// scoreboard and is graded by the same 15-minute sampling as every human call.
// The design rule that keeps it honest: the AI may only predict metrics the
// sampler can grade itself (peak demand, renewable share). An ungradable "any
// entity" opinion would never resolve, so it isn't allowed — a prediction here
// always comes with a built-in, automatic verdict.

const SYSTEM = `You are the forecasting desk of Urja Brief, an honest India energy-intelligence site.
Make ONE dated, falsifiable prediction about India's national grid for the NEXT 7 DAYS.
You may ONLY predict metrics the site can auto-grade:
- "peakDemandMw": all-India peak demand met, in megawatts (e.g. 275000)
- "maxRePct": renewables' highest share of generation in a day, in percent (e.g. 38)
Ground your call in the observations given. Be specific but not reckless.
Reply with ONLY compact JSON, no prose, no code fence:
{"metric":"peakDemandMw"|"maxRePct","direction":"above"|"below","target":<number>,"claim":"<one sentence>","basis":"<one sentence reasoning>"}`;

// ISO week key (YYYY-Www) so there is at most one AI call per calendar week.
function isoWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function generateAiForecast(): Promise<Forecast | null> {
  const rollups = await getRecentRollups();
  if (rollups.length < 1) return null;

  const recentPeakMw = Math.max(...rollups.map((r) => r.peakMw));
  const maxRePct = Math.max(...rollups.map((r) => r.maxRePct));
  const days = rollups.length;
  const user = `Observations from our own 15-minute sampling over the last ${days} day(s), as of ${istDate(0)} IST:
- recent daily peak demand reached about ${Math.round(recentPeakMw).toLocaleString("en-US")} MW (${(recentPeakMw / 1000).toFixed(0)} GW)
- highest renewables share observed: ${maxRePct.toFixed(1)}%
- it is monsoon season with humid, high-cooling-load conditions
Make your single best call for the next 7 days.`;

  const raw = await callGLMRetry(SYSTEM, user, 2500);
  if (!raw) return null;

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let obj: { metric?: string; direction?: string; target?: unknown; claim?: string; basis?: string };
  try {
    obj = JSON.parse(match[0]);
  } catch {
    return null;
  }

  if (obj.metric !== "peakDemandMw" && obj.metric !== "maxRePct") return null;
  if (obj.direction !== "above" && obj.direction !== "below") return null;
  const target = Number(obj.target);
  if (!Number.isFinite(target) || target <= 0) return null;
  // Sanity bounds so a hallucinated number never lands on the board.
  if (obj.metric === "peakDemandMw" && (target < 150_000 || target > 400_000)) return null;
  if (obj.metric === "maxRePct" && (target < 1 || target > 90)) return null;
  const claim = String(obj.claim ?? "").trim().slice(0, 240);
  const basis = String(obj.basis ?? "").trim().slice(0, 240);
  if (!claim || !basis) return null;

  const madeOn = istDate(0);
  const resolvesOn = istDate(7);
  return {
    id: `ai-${isoWeek(madeOn)}`,
    ai: true,
    madeOn,
    horizon: `By ${resolvesOn}`,
    claim,
    basis: `AI call (GLM): ${basis}`,
    resolvesOn,
    metric: obj.metric,
    direction: obj.direction,
    target,
  };
}
