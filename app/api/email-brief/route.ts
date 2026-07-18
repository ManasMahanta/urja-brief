import { NextResponse } from "next/server";
import { getPowerBrief } from "@/lib/power-ai";
import { getGridSnapshot } from "@/lib/grid-live";
import { getEnergyHeadlines } from "@/lib/power";
import { getRecentRollups } from "@/lib/samples";
import { getCleanForecast, hourLabel } from "@/lib/clean-forecast";
import { getScoreboard } from "@/lib/forecasts";
import { site } from "@/lib/site";

const mw = (value: number) => `${Math.round(value).toLocaleString("en-IN")} MW`;

export const maxDuration = 120;

// Composes the grid pulse, the AI signal brief, and the top headlines into a
// newsletter email and creates it as a DRAFT in Buttondown. You review and hit
// send there — this route never sends to subscribers on its own. To auto-send
// instead, change `status` below to "about_to_send".
// Trigger: Vercel Cron (Authorization header) or GET /api/email-brief?secret=<CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const queryParam = new URL(request.url).searchParams.get("secret");
  const authorized =
    !!secret && (authHeader === `Bearer ${secret}` || queryParam === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "BUTTONDOWN_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const [brief, snapshot, headlines, rollups, forecast, scoreboard] = await Promise.all([
    getPowerBrief(),
    getGridSnapshot(),
    getEnergyHeadlines(5),
    getRecentRollups(),
    getCleanForecast(),
    getScoreboard(),
  ]);

  if (!brief && !snapshot) {
    return NextResponse.json(
      { error: "Neither the grid snapshot nor the AI brief is available — nothing to send." },
      { status: 503 },
    );
  }

  // "This week in the grid" — observed extremes from our own 15-min sampling.
  const week = rollups.slice(0, 7);
  let weekSection = "";
  if (week.length) {
    const peakDay = week.reduce((a, b) => (b.peakMw > a.peakMw ? b : a));
    const greenDay = week.reduce((a, b) => (b.maxRePct > a.maxRePct ? b : a));
    weekSection = [
      "**This week in the grid** (observed by our 15-minute sampling)",
      `- Highest demand met: ${mw(peakDay.peakMw)} on ${peakDay.date}`,
      `- Highest renewables' share: ${greenDay.maxRePct.toFixed(1)}% on ${greenDay.date}`,
      `- Days sampled: ${week.length}`,
    ].join("\n");
  }

  // Typical cleanest hours, from the accumulated carbon-intensity profile.
  const cleanSection = forecast
    ? `**Cleanest hours to use power**\nOn a typical day the grid is cleanest around **${hourLabel(forecast.bestWindow.startHour)}–${hourLabel(forecast.bestWindow.endHour)}** — the best window to run heavy loads. [Live carbon desk](${site.url.replace(/\/$/, "")}/carbon)`
    : "";

  // Scoreboard: our open and settled calls.
  let boardSection = "";
  if (scoreboard.forecasts.length) {
    const open = scoreboard.forecasts.filter((f) => f.result === "pending");
    const settled = scoreboard.forecasts.filter((f) => f.result !== "pending");
    boardSection = [
      "**On the scoreboard**",
      ...open.slice(0, 3).map((f) => `- Open: ${f.claim}`),
      ...settled.slice(0, 2).map((f) => `- ${f.result === "hit" ? "✓ Hit" : "✗ Miss"}: ${f.claim}`),
      `[See how our calls resolve](${site.url.replace(/\/$/, "")}/scoreboard)`,
    ].join("\n");
  }

  const today = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const base = site.url.replace(/\/$/, "");

  const pulse = snapshot
    ? [
        "**Grid pulse** (MERIT, instantaneous MW at fetch time)",
        `- Demand met: ${Math.round(snapshot.demandMetMw).toLocaleString("en-IN")} MW`,
        `- Renewables' share of generation: ${snapshot.renewableSharePct.toFixed(1)}%`,
        `- Thermal ${snapshot.mix.thermal.toLocaleString("en-IN")} · hydro ${snapshot.mix.hydro.toLocaleString("en-IN")} · renewable ${snapshot.mix.renewable.toLocaleString("en-IN")} MW`,
      ].join("\n")
    : "**Grid pulse**: MERIT was unreachable at send time — no figures rather than stale ones.";

  const body =
    pulse +
    (brief ? `\n\n${brief}` : "") +
    (weekSection ? `\n\n${weekSection}` : "") +
    (cleanSection ? `\n\n${cleanSection}` : "") +
    (boardSection ? `\n\n${boardSection}` : "") +
    (headlines.length
      ? `\n\n**From the newswire**\n${headlines.map((h) => `- [${h.title}](${h.url})`).join("\n")}`
      : "") +
    `\n\n---\n\n_Educational only, not advice. MW figures are instantaneous MERIT readings, not official CEA records._ The live desk: [${site.name}](${base}) · [carbon desk](${base}/carbon) · [open data](${base}/data)`;

  const res = await fetch("https://api.buttondown.com/v1/emails", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: `${site.name} — grid pulse, ${today}`,
      body,
      // "draft" = safe: appears in Buttondown for review. Change to
      // "about_to_send" to dispatch to subscribers immediately.
      status: "draft",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Buttondown email create failed", res.status, detail);
    return NextResponse.json(
      { error: "Buttondown rejected the draft.", status: res.status },
      { status: 502 },
    );
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return NextResponse.json({
    ok: true,
    status: "draft",
    emailId: data.id ?? null,
    message: "Draft created in Buttondown — review and send it there.",
  });
}
