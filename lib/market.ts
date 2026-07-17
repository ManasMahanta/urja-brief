// Live Indian-market data, pulled from free/keyless public endpoints.
// Primary source: Yahoo Finance's unofficial chart/quote/trending APIs.
// Every fetcher returns [] / null on failure so a flaky upstream never breaks
// a page — the same resilience contract the rest of the site relies on.
//
// Optional premium path: if MARKETDATA_API_KEY is set (e.g. Twelve Data), the
// single-symbol quote lookup uses it first and falls back to Yahoo. Everything
// works with zero configuration.

const MIN = 60;

// ---- shared fetch helpers -------------------------------------------------

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) BazaarBrief/1.0";

async function getJson(url: string, revalidate: number): Promise<unknown> {
  const res = await fetch(url, {
    next: { revalidate },
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.json();
}

async function getText(url: string, revalidate: number): Promise<string> {
  const res = await fetch(url, {
    next: { revalidate },
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.text();
}

// ---- types ----------------------------------------------------------------

export type Quote = {
  symbol: string; // Yahoo symbol, e.g. ^NSEI or RELIANCE.NS
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;
  week52High?: number;
  week52Low?: number;
  exchange?: string;
  volume?: number; // regular-session traded volume
  spark?: number[]; // intraday close series for a mini sparkline
};

export type Mover = {
  symbol: string; // plain ticker, e.g. RELIANCE
  name: string;
  price: number;
  changePercent: number;
};

export type NewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt: string; // ISO
};

export type TrendingTicker = {
  symbol: string; // plain ticker without .NS
  name: string;
  changePercent?: number;
};

// ---- index & instrument definitions --------------------------------------

/** Headline instruments for the ticker strip (indices + macro references). */
export const TICKER_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: "^NSEI", name: "NIFTY 50" },
  { symbol: "^BSESN", name: "SENSEX" },
  { symbol: "^NSEBANK", name: "BANK NIFTY" },
  { symbol: "^CNXIT", name: "NIFTY IT" },
  { symbol: "^INDIAVIX", name: "INDIA VIX" },
  { symbol: "USDINR=X", name: "USD/INR" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "GC=F", name: "GOLD" },
  { symbol: "BZ=F", name: "BRENT" },
];

/** Sector indices for the sector-heat grid. */
export const SECTOR_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: "^NSEBANK", name: "Bank" },
  { symbol: "^CNXIT", name: "IT" },
  { symbol: "^CNXAUTO", name: "Auto" },
  { symbol: "^CNXPHARMA", name: "Pharma" },
  { symbol: "^CNXFMCG", name: "FMCG" },
  { symbol: "^CNXENERGY", name: "Energy" },
  { symbol: "^CNXMETAL", name: "Metal" },
  { symbol: "^CNXREALTY", name: "Realty" },
];

/** A slice of large-cap constituents used to compute gainers/losers. */
export const MOVERS_UNIVERSE: { symbol: string; name: string }[] = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel" },
  { symbol: "ITC", name: "ITC" },
  { symbol: "LT", name: "Larsen & Toubro" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever" },
  { symbol: "AXISBANK", name: "Axis Bank" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance" },
  { symbol: "MARUTI", name: "Maruti Suzuki" },
  { symbol: "SUNPHARMA", name: "Sun Pharma" },
  { symbol: "TATAMOTORS", name: "Tata Motors" },
  { symbol: "M&M", name: "Mahindra & Mahindra" },
  { symbol: "TITAN", name: "Titan" },
  { symbol: "NTPC", name: "NTPC" },
  { symbol: "POWERGRID", name: "Power Grid" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement" },
  { symbol: "ASIANPAINT", name: "Asian Paints" },
  { symbol: "WIPRO", name: "Wipro" },
  { symbol: "ADANIENT", name: "Adani Enterprises" },
  { symbol: "TATASTEEL", name: "Tata Steel" },
];

// ---- Yahoo chart-based quote (reliable, keyless) --------------------------

type ChartMeta = {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  currency?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  exchangeName?: string;
  symbol?: string;
};

/** One instrument via Yahoo's v8 chart endpoint (no crumb/cookie required). */
async function fetchChartQuote(
  symbol: string,
  name: string,
  revalidate: number,
): Promise<Quote | null> {
  try {
    const data = (await getJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`,
      revalidate,
    )) as {
      chart?: { result?: Array<{ meta?: ChartMeta; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
    };
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    const price = meta.regularMarketPrice;
    const prev =
      meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (c): c is number => typeof c === "number",
    );

    return {
      symbol: meta.symbol ?? symbol,
      name,
      price,
      change,
      changePercent,
      currency: meta.currency ?? "INR",
      previousClose: prev,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      week52High: meta.fiftyTwoWeekHigh,
      week52Low: meta.fiftyTwoWeekLow,
      exchange: meta.exchangeName,
      volume: meta.regularMarketVolume,
      spark: closes.length > 1 ? closes : undefined,
    };
  } catch {
    return null;
  }
}

/** Daily close series (~6 months) for a symbol, for computing indicators.
 *  Daily bars only change once a day — cache for hours, not minutes. */
export async function getDailyCloses(symbol: string): Promise<number[] | null> {
  try {
    const data = (await getJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=6mo&interval=1d`,
      6 * 60 * 60,
    )) as {
      chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
    };
    const closes = (data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(
      (c): c is number => typeof c === "number",
    );
    return closes.length > 1 ? closes : null;
  } catch {
    return null;
  }
}

async function fetchMany(
  instruments: { symbol: string; name: string }[],
  revalidate: number,
): Promise<Quote[]> {
  const settled = await Promise.allSettled(
    instruments.map((i) => fetchChartQuote(i.symbol, i.name, revalidate)),
  );
  return settled
    .filter(
      (s): s is PromiseFulfilledResult<Quote | null> => s.status === "fulfilled",
    )
    .map((s) => s.value)
    .filter((q): q is Quote => q !== null);
}

/** Headline index/macro quotes for the ticker strip. */
export async function getTickerQuotes(): Promise<Quote[]> {
  return fetchMany(TICKER_SYMBOLS, 2 * MIN);
}

/** Same instruments, but a short cache window for the live-polling endpoint.
 *  Upstream (Yahoo) is still only hit at most once per `revalidate` seconds, so
 *  frequent client polling never hammers the source. */
export async function getLiveTicker(revalidate = 20): Promise<Quote[]> {
  return fetchMany(TICKER_SYMBOLS, revalidate);
}

/** The three flagship indices, for prominent display. */
export async function getHeadlineIndices(): Promise<Quote[]> {
  return fetchMany(TICKER_SYMBOLS.slice(0, 4), 2 * MIN);
}

/** Sector index performance, sorted best-to-worst. */
export async function getSectorHeat(): Promise<Quote[]> {
  const quotes = await fetchMany(SECTOR_SYMBOLS, 5 * MIN);
  return quotes.sort((a, b) => b.changePercent - a.changePercent);
}

/** Look up a single stock. Accepts a bare ticker (RELIANCE), .NS or .BO. */
export async function getStockQuote(input: string): Promise<Quote | null> {
  const raw = input.trim().toUpperCase();
  if (!raw) return null;

  // Optional premium provider first (Twelve Data), then Yahoo fallback.
  const premium = await fetchPremiumQuote(raw);
  if (premium) return premium;

  const symbol = /\.(NS|BO)$/.test(raw) ? raw : `${raw}.NS`;
  const q = await fetchChartQuote(symbol, symbol.replace(/\.(NS|BO)$/, ""), MIN);
  if (q) return q;
  // Retry on BSE if NSE had nothing.
  if (!/\.(NS|BO)$/.test(raw)) {
    return fetchChartQuote(`${raw}.BO`, raw, MIN);
  }
  return null;
}

/** Gainers and losers computed from the large-cap universe. */
export async function getMovers(
  limit = 6,
): Promise<{ gainers: Mover[]; losers: Mover[] }> {
  const instruments = MOVERS_UNIVERSE.map((m) => ({
    symbol: `${m.symbol}.NS`,
    name: m.name,
  }));
  const quotes = await fetchMany(instruments, 5 * MIN);
  const movers: Mover[] = quotes.map((q) => ({
    symbol: q.symbol.replace(/\.(NS|BO)$/, ""),
    name: q.name,
    price: q.price,
    changePercent: q.changePercent,
  }));
  const sorted = [...movers].sort((a, b) => b.changePercent - a.changePercent);
  return {
    gainers: sorted.slice(0, limit),
    losers: sorted.slice(-limit).reverse(),
  };
}

// ---- Trending tickers (Yahoo, keyless) ------------------------------------

export async function getTrendingTickers(limit = 8): Promise<TrendingTicker[]> {
  // 1) Yahoo's IN "trending" feed — now usually returns an empty list, but try
  //    it first in case the region ever comes back.
  try {
    const data = (await getJson(
      `https://query1.finance.yahoo.com/v1/finance/trending/IN?count=${limit}`,
      15 * MIN,
    )) as {
      finance?: { result?: Array<{ quotes?: Array<{ symbol?: string; shortName?: string }> }> };
    };
    const quotes = data?.finance?.result?.[0]?.quotes ?? [];
    const list = quotes
      .filter((q) => q?.symbol)
      .map((q) => ({
        symbol: String(q.symbol).replace(/\.(NS|BO)$/, ""),
        name: q.shortName ? String(q.shortName) : String(q.symbol),
      }));
    if (list.length) return list.slice(0, limit);
  } catch {
    /* fall through to the computed list */
  }

  // 2) Fallback (reliable): "most active" — the large-cap names with the
  //    highest traded volume today, via the keyless chart endpoint.
  const instruments = MOVERS_UNIVERSE.map((m) => ({
    symbol: `${m.symbol}.NS`,
    name: m.name,
  }));
  const quotes = await fetchMany(instruments, 5 * MIN);
  return quotes
    .filter((q) => typeof q.volume === "number" && q.volume > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, limit)
    .map((q) => ({
      symbol: q.symbol.replace(/\.(NS|BO)$/, ""),
      name: q.name,
      changePercent: q.changePercent,
    }));
}

// ---- Market news (free RSS) -----------------------------------------------

const NEWS_FEEDS: { source: string; url: string }[] = [
  {
    source: "ET Markets",
    url: "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
  },
  {
    source: "Moneycontrol",
    url: "https://www.moneycontrol.com/rss/marketreports.xml",
  },
  {
    source: "Business Standard",
    url: "https://www.business-standard.com/rss/markets-106.rss",
  },
  {
    source: "Livemint",
    url: "https://www.livemint.com/rss/markets",
  },
];

function xmlBlocks(xml: string, tag: string): string[] {
  return xml.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "g")) ?? [];
}

function xmlText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

export async function getMarketNews(limit = 12): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async ({ source, url }) => {
      const xml = await getText(url, 10 * MIN);
      return xmlBlocks(xml, "item")
        .slice(0, 8)
        .map((item) => {
          const date = new Date(xmlText(item, "pubDate"));
          return {
            title: xmlText(item, "title"),
            source,
            url: xmlText(item, "link").split("?")[0],
            publishedAt: Number.isNaN(date.getTime())
              ? ""
              : date.toISOString(),
          };
        })
        .filter((p) => p.title && p.url);
    }),
  );

  const seen = new Set<string>();
  return results
    .filter(
      (r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled",
    )
    .flatMap((r) => r.value)
    .filter((p) => {
      const key = p.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, limit);
}

// ---- Optional premium quote provider (Twelve Data) ------------------------

async function fetchPremiumQuote(raw: string): Promise<Quote | null> {
  const key = process.env.MARKETDATA_API_KEY;
  if (!key) return null;
  try {
    const symbol = raw.replace(/\.(NS|BO)$/, "");
    const data = (await getJson(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&exchange=NSE&apikey=${key}`,
      MIN,
    )) as {
      symbol?: string;
      name?: string;
      close?: string;
      previous_close?: string;
      high?: string;
      low?: string;
      fifty_two_week?: { high?: string; low?: string };
    };
    const price = Number(data.close);
    if (!data.symbol || Number.isNaN(price)) return null;
    const prev = Number(data.previous_close) || price;
    return {
      symbol: `${symbol}.NS`,
      name: data.name || symbol,
      price,
      change: price - prev,
      changePercent: prev ? ((price - prev) / prev) * 100 : 0,
      currency: "INR",
      previousClose: prev,
      dayHigh: Number(data.high) || undefined,
      dayLow: Number(data.low) || undefined,
      week52High: Number(data.fifty_two_week?.high) || undefined,
      week52Low: Number(data.fifty_two_week?.low) || undefined,
      exchange: "NSE",
    };
  } catch {
    return null;
  }
}

// ---- formatting -----------------------------------------------------------

export function formatPrice(n: number, currency = "INR"): string {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : "";
  return `${symbol}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatChange(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
