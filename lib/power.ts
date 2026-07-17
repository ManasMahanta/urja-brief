export type PowerQuote = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
};

export type EnergyHeadline = { title: string; url: string; publishedAt: string };

const POWER_COMPANIES = [
  { symbol: "NTPC.NS", name: "NTPC" },
  { symbol: "POWERGRID.NS", name: "Power Grid" },
  { symbol: "TATAPOWER.NS", name: "Tata Power" },
  { symbol: "ADANIGREEN.NS", name: "Adani Green" },
  { symbol: "JSWENERGY.NS", name: "JSW Energy" },
];

const ua = "Mozilla/5.0 UrjaBrief/1.0";

export async function getPowerQuotes(): Promise<PowerQuote[]> {
  const quotes = await Promise.all(
    POWER_COMPANIES.map(async (company) => {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${company.symbol}?range=1d&interval=5m`,
          { next: { revalidate: 300 }, headers: { "User-Agent": ua } },
        );
        if (!response.ok) return null;
        const data = (await response.json()) as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number } }> } };
        const meta = data.chart?.result?.[0]?.meta;
        if (!meta || typeof meta.regularMarketPrice !== "number") return null;
        const previous = meta.chartPreviousClose ?? meta.regularMarketPrice;
        return { symbol: company.symbol.replace(".NS", ""), name: company.name, price: meta.regularMarketPrice, changePercent: previous ? ((meta.regularMarketPrice - previous) / previous) * 100 : 0 };
      } catch {
        return null;
      }
    }),
  );
  return quotes.filter((quote): quote is PowerQuote => quote !== null);
}

const strip = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();

async function getHeadlines(query: string, limit: number): Promise<EnergyHeadline[]> {
  try {
    const response = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`, { next: { revalidate: 900 }, headers: { "User-Agent": ua } });
    if (!response.ok) return [];
    const xml = await response.text();
    return (xml.match(/<item>[\s\S]*?<\/item>/g) ?? []).slice(0, limit).map((item) => {
      const field = (name: string) => strip(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
      const date = new Date(field("pubDate"));
      return { title: field("title"), url: field("link"), publishedAt: Number.isNaN(date.getTime()) ? "" : date.toISOString() };
    }).filter((item) => item.title && item.url);
  } catch {
    return [];
  }
}

export const getEnergyHeadlines = (limit = 6) => getHeadlines("India power sector when:7d", limit);

// Policy-scoped newswire: ministries and regulators rather than the market.
export const getPolicyHeadlines = (limit = 8) =>
  getHeadlines('India ("Ministry of Power" OR MNRE OR CERC OR CEA electricity OR "power policy") when:14d', limit);

// Storage-scoped newswire: BESS tenders, pumped storage, storage policy.
export const getStorageHeadlines = (limit = 8) =>
  getHeadlines('India ("battery energy storage" OR BESS OR "pumped storage" OR "energy storage tender") when:30d', limit);

export const officialSources = [
  { name: "CEA Daily Generation Report", cadence: "Daily", href: "https://cea.nic.in/opm_grid_operation/daily-generation-report/?lang=en", detail: "All-India generation and fuel mix." },
  { name: "CEA Daily Renewable Generation", cadence: "Daily", href: "https://cea.nic.in/sitemap/?lang=en", detail: "Renewable generation reporting." },
  { name: "CEA Installed Capacity", cadence: "Monthly", href: "https://cea.nic.in/power-data-management-division/?lang=en", detail: "Capacity, generation, transmission, and demand reports." },
];
