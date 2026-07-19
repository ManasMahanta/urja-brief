import { NextResponse } from "next/server";
import { generateAiForecast } from "@/lib/ai-forecast";
import type { Forecast } from "@/lib/forecasts";

// The runnable AI-prediction mechanism: hit this (cron or by hand, secret-gated)
// and the model authors a fresh dated call, which is appended to the
// repo-as-database forecasts.json so the scoreboard grades it. Committing needs
// a GITHUB_TOKEN; without one the call is still returned so nothing is lost.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const REPO = process.env.GITHUB_REPO ?? "ManasMahanta/urja-brief";
const FILE = "data/forecasts.json";

async function commitForecast(forecast: Forecast): Promise<"committed" | "exists" | "no-token" | "failed"> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return "no-token";
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "urja-brief-ai-forecast",
  };
  try {
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}?ref=main`, { headers });
    if (!getRes.ok) return "failed";
    const file = (await getRes.json()) as { sha: string; content: string };
    const current = JSON.parse(Buffer.from(file.content, "base64").toString("utf8")) as Forecast[];
    if (current.some((f) => f.id === forecast.id)) return "exists"; // one AI call per week
    const next = [...current, forecast];
    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `AI forecast: ${forecast.id}`,
        content: Buffer.from(`${JSON.stringify(next, null, 1)}\n`).toString("base64"),
        sha: file.sha,
        branch: "main",
      }),
    });
    return putRes.ok ? "committed" : "failed";
  } catch {
    return "failed";
  }
}

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const forecast = await generateAiForecast();
  if (!forecast) return NextResponse.json({ error: "generation failed" }, { status: 502 });
  const persisted = await commitForecast(forecast);
  return NextResponse.json({ forecast, persisted });
}
