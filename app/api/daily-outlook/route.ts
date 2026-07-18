import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getCarbonNow } from "@/lib/carbon";
import { getGridStress } from "@/lib/stress";
import { getCleanForecast, hourLabel } from "@/lib/clean-forecast";
import { getRecentRollups } from "@/lib/samples";
import { site } from "@/lib/site";

export const maxDuration = 60;

// The daily grid outlook — the subscriber-facing "alert" the /subscribe page
// promises. Runs once a day (Vercel Cron) and, unlike the weekly brief, SENDS:
// a short morning note with today's grid stress, live carbon intensity, and the
// cleanest hours to use power. It also revalidates the live-desk ISR pages, so
// it doubles as the daily cache refresh (keeping us within Hobby's cron limit).
//
// Trigger: Vercel Cron (Bearer $CRON_SECRET) or GET ?secret=<CRON_SECRET>.
// Add ?preview=1 to create a Buttondown DRAFT instead of sending — for testing.

const mw = (value: number) => `${Math.round(value).toLocaleString("en-IN")} MW`;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const authorized =
    !!secret && (authHeader === `Bearer ${secret}` || url.searchParams.get("secret") === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const preview = url.searchParams.get("preview") === "1";

  // Daily cache refresh for the ISR desks (the metric pages render dynamically
  // now, but the others still benefit from a nudge).
  for (const path of ["/", "/generation", "/storage", "/records", "/scoreboard", "/ev", "/policy"]) {
    revalidatePath(path);
  }
  revalidateTag("urja-power-brief", "max");

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, refreshed: true, emailed: false, reason: "BUTTONDOWN_API_KEY not set." });
  }

  const [stress, carbon, forecast, rollups] = await Promise.all([
    getGridStress(),
    getCarbonNow(),
    getCleanForecast(),
    getRecentRollups(),
  ]);

  // Don't send an empty outlook: if MERIT was unreachable, skip the email
  // (the refresh above still ran).
  if (!stress && !carbon) {
    return NextResponse.json({ ok: true, refreshed: true, emailed: false, reason: "Grid data unavailable — no email sent." });
  }

  const base = site.url.replace(/\/$/, "");
  const today = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

  const lines: string[] = [];
  if (stress) lines.push(`**Grid stress:** ${stress.headline}. ${stress.detail}`);
  if (carbon) {
    lines.push(
      `**Carbon intensity now:** ${Math.round(carbon.intensityGco2)} g/kWh${carbon.verdict ? ` — ${carbon.verdict.headline.toLowerCase()}` : ""}.`,
    );
  }
  if (forecast) {
    lines.push(
      `**Cleanest hours to use power:** around **${hourLabel(forecast.bestWindow.startHour)}–${hourLabel(forecast.bestWindow.endHour)}** — shift heavy loads (geyser, washing, EV charge) there.`,
    );
  }
  const yesterday = rollups[0];
  if (yesterday) lines.push(`**Yesterday's observed peak:** ${mw(yesterday.peakMw)} (${yesterday.date}).`);

  const body =
    lines.join("\n\n") +
    `\n\n---\n\n_Educational only, not advice. Live figures are instantaneous MERIT readings; carbon intensity is an operational estimate._\n[Carbon desk](${base}/carbon) · [Grid desk](${base}/grid) · [Open data](${base}/data)`;

  const res = await fetch("https://api.buttondown.com/v1/emails", {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: `${site.name} — today's grid outlook, ${today}`,
      body,
      // Real runs send; preview creates a draft so we can check content safely.
      status: preview ? "draft" : "about_to_send",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Buttondown daily outlook failed", res.status, detail);
    return NextResponse.json({ error: "Buttondown rejected the email.", status: res.status }, { status: 502 });
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return NextResponse.json({
    ok: true,
    refreshed: true,
    emailed: true,
    status: preview ? "draft" : "sent",
    emailId: data.id ?? null,
  });
}
