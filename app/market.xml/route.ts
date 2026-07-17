import { getMarketNews, getMovers, formatChange } from "@/lib/market";
import { site } from "@/lib/site";

export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function item(title: string, url: string, description: string): string {
  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <description>${escapeXml(description)}</description>
    </item>`;
}

// Live market pulse as RSS: today's movers and the top headlines.
export async function GET() {
  const [movers, news] = await Promise.all([getMovers(5), getMarketNews(10)]);

  const items = [
    ...movers.gainers.map((m) =>
      item(`[Gainer] ${m.name}`, `https://finance.yahoo.com/quote/${m.symbol}.NS`, `${formatChange(m.changePercent)} today`),
    ),
    ...movers.losers.map((m) =>
      item(`[Loser] ${m.name}`, `https://finance.yahoo.com/quote/${m.symbol}.NS`, `${formatChange(m.changePercent)} today`),
    ),
    ...news.map((n) => item(`[News] ${n.title}`, n.url, n.source)),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${site.name} — Markets`)}</title>
    <link>${site.url}/markets</link>
    <description>A live pulse on Indian markets: today's gainers and losers and the headlines behind them. Educational only, not investment advice.</description>
    <language>en-in</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
