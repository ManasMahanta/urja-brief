import { unstable_cache } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";

// Official retail petrol/diesel prices from the Petroleum Planning & Analysis
// Cell (PPAC, ppac.gov.in) — the government's own price authority. PPAC has no
// JSON feed: it posts a dated "Daily Price MS/HSD Metro" PDF, linked from the
// home page with a rotating timestamped filename. So we scrape the home page for
// the latest link, fetch that PDF, and parse page 1 (the four metros, petrol on
// the left, diesel on the right). Same unpdf path as the CEA coal parser.
// Everything degrades to null so the desk falls back to its reference prices.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const METROS = ["Delhi", "Mumbai", "Chennai", "Kolkata"] as const;
export type Metro = (typeof METROS)[number];

export type PpacPrices = {
  postedOn: string; // e.g. "16-Jul-26"
  sourceUrl: string;
  metros: Record<Metro, { petrol: number; diesel: number }>;
};

async function fetchPpacPrices(): Promise<PpacPrices | null> {
  try {
    const homeRes = await fetch("https://ppac.gov.in/", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15_000),
    });
    if (!homeRes.ok) return null;
    const home = await homeRes.text();

    const linkMatch = home.match(
      /download\.php\?file=importantnews\/[0-9]+_PP_9_a_DailyPriceMSHSD_Metro_[0-9.]+\.pdf/i,
    );
    if (!linkMatch) return null;
    const url = "https://ppac.gov.in/" + linkMatch[0].replace(/&amp;/g, "&");

    const pdfRes = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(25_000),
    });
    if (!pdfRes.ok) return null;
    const buf = new Uint8Array(await pdfRes.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: false });
    const page = text[0] || "";

    const posted = page.match(/Table Posted:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2})/)?.[1];
    // First data row: DATE p1 p2 p3 p4  DATE d1 d2 d3 d4 (metros in header order).
    const row = page.match(
      /(\d{1,2}-[A-Za-z]{3}-\d{2})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+\d{1,2}-[A-Za-z]{3}-\d{2}\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/,
    );
    if (!posted || !row) return null;

    const nums = row.slice(2).map(Number);
    if (nums.some((n) => !Number.isFinite(n) || n <= 0 || n > 500)) return null;

    const metros = {} as PpacPrices["metros"];
    METROS.forEach((city, i) => {
      metros[city] = { petrol: nums[i], diesel: nums[i + 4] };
    });
    return { postedOn: posted, sourceUrl: url, metros };
  } catch {
    return null;
  }
}

export const getPpacFuelPrices = unstable_cache(fetchPpacPrices, ["urja-ppac-fuel-prices"], {
  revalidate: 43_200, // 12h — PPAC posts at most once a day
  tags: ["urja-ppac"],
});

// Indian Basket crude — the crude mix India actually buys, priced by PPAC. Its
// crude page renders a Google chart from a JSON endpoint (no auth): a monthly
// $/bbl series for the financial year. The last month is the latest print.
export type PpacCrude = {
  month: string; // e.g. "July"
  fy: string; // e.g. "2026-2027"
  usdPerBbl: number;
  series: Array<{ month: string; usdPerBbl: number }>;
};

// India's financial year runs April–March; pick the current one in IST.
function currentIndianFy(): string {
  const ist = new Date(Date.now() + 5.5 * 3_600_000);
  const y = ist.getUTCFullYear();
  return ist.getUTCMonth() >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

async function fetchPpacCrude(): Promise<PpacCrude | null> {
  try {
    const fy = currentIndianFy();
    // reportBy=4 is $/bbl; pageId=30 is the crude-oil page.
    const res = await fetch("https://ppac.gov.in/AjaxController/getInternationalPricesCrudeOilChartData", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: `financialYear=${encodeURIComponent(fy)}&reportBy=4&pageId=30`,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: Array<{ month?: string; year?: number }> };
    const series = (json.result ?? [])
      .map((r) => ({ month: String(r.month ?? ""), usdPerBbl: Number(r.year) }))
      .filter((r) => r.month && Number.isFinite(r.usdPerBbl) && r.usdPerBbl > 0 && r.usdPerBbl < 500);
    if (!series.length) return null;
    const last = series[series.length - 1];
    return { month: last.month, fy, usdPerBbl: last.usdPerBbl, series };
  } catch {
    return null;
  }
}

export const getPpacCrude = unstable_cache(fetchPpacCrude, ["urja-ppac-crude"], {
  revalidate: 43_200,
  tags: ["urja-ppac"],
});
