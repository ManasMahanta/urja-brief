import { NextResponse } from "next/server";
import { getDailyBrief } from "@/lib/brief";
import { site } from "@/lib/site";
import { getMarketNews, getMovers, formatChange } from "@/lib/market";

export const maxDuration = 120;

// Composes the daily market brief plus a few top items into a newsletter email
// and creates it as a DRAFT in Buttondown. You review and hit send there — this
// route never sends to subscribers on its own. To auto-send instead, change
// `status` below to "about_to_send" (see the comment).
// Trigger: GET /api/email-brief?secret=<CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = new URL(request.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "BUTTONDOWN_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const [brief, movers, news] = await Promise.all([
    getDailyBrief(),
    getMovers(3),
    getMarketNews(4),
  ]);

  if (!brief) {
    return NextResponse.json(
      { error: "No brief available to send (is ZAI_API_KEY set?)." },
      { status: 503 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const base = site.url.replace(/\/$/, "");
  const list = (title: string, items: { label: string; url: string }[]) =>
    items.length
      ? `\n\n**${title}**\n${items.map((i) => `- [${i.label}](${i.url})`).join("\n")}`
      : "";

  const body =
    `${brief}` +
    (movers.gainers.length
      ? `\n\n**Top gainers**\n${movers.gainers
          .map((m) => `- ${m.name}: ${formatChange(m.changePercent)}`)
          .join("\n")}`
      : "") +
    (movers.losers.length
      ? `\n\n**Top losers**\n${movers.losers
          .map((m) => `- ${m.name}: ${formatChange(m.changePercent)}`)
          .join("\n")}`
      : "") +
    list(
      "Headlines",
      news.map((n) => ({ label: n.title, url: n.url })),
    ) +
    `\n\n---\n\n_Educational only, not investment advice._ More live on the [markets dashboard](${base}/markets) · [${site.name}](${base})`;

  const subject = `${site.name} — ${today}`;

  const res = await fetch("https://api.buttondown.com/v1/emails", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
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
