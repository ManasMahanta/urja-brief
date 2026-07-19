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

// India's crude balance — import bill and import dependence — from the same
// AjaxController JSON feeds (import-export, indigenous production, crude
// processing). Values are per financial year; some cells wrap the number in an
// <b> tag, so strip tags before parsing. Uses the last COMPLETE FY for a stable
// annual figure. Dependence = 1 − indigenous crude ÷ crude processed.
export type PpacCrudeBalance = {
  fy: string; // e.g. "2025-2026"
  importBillUsdBn: number;
  importDependencePct: number;
  indigenousMmt: number;
  processedMmt: number;
};

// The most recent financial year that has fully ended (India FY = Apr–Mar).
function lastCompleteIndianFy(): string {
  const [start] = currentIndianFy().split("-").map(Number);
  return `${start - 1}-${start}`;
}

const stripTags = (v: unknown): string => String(v ?? "").replace(/<[^>]+>/g, "").trim();
const stripNum = (v: unknown): number => Number(stripTags(v).replace(/,/g, ""));

async function ppacPost(method: string, fy: string, reportBy: number, pageId: number) {
  const res = await fetch(`https://ppac.gov.in/AjaxController/${method}`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: `financialYear=${encodeURIComponent(fy)}&reportBy=${reportBy}&pageId=${pageId}`,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`ppac ${method} ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  const r = json.result;
  return (Array.isArray(r) ? r : r && typeof r === "object" ? Object.values(r) : []) as Array<
    Record<string, unknown>
  >;
}

async function fetchPpacCrudeBalance(): Promise<PpacCrudeBalance | null> {
  try {
    const fy = lastCompleteIndianFy();
    const [imp, prod, proc] = await Promise.all([
      ppacPost("getImportExports", fy, 3, 14), // crude import value, $ million
      ppacPost("getProductionJson", fy, 1, 3), // indigenous crude, MMT (monthly rows)
      ppacPost("getCrudeProcessingData", fy, 1, 41), // crude processed, '000 MT
    ]);

    const crudeRow = imp.find((r) => /^crude oil$/i.test(stripTags(r.title)));
    const importUsdM = crudeRow ? stripNum(crudeRow.total) : NaN;

    const indigenousMmt = prod.reduce((s, r) => s + (stripNum(r.total) || 0), 0);

    const grand = proc.find((r) => /grand\s*total/i.test(stripTags(r.title)));
    const processedMmt = grand ? stripNum(grand.total) / 1000 : NaN; // '000 MT → MMT

    if (
      !Number.isFinite(importUsdM) || importUsdM <= 0 ||
      !Number.isFinite(indigenousMmt) || indigenousMmt <= 0 ||
      !Number.isFinite(processedMmt) || processedMmt <= 0 ||
      indigenousMmt >= processedMmt
    ) {
      return null;
    }

    return {
      fy,
      importBillUsdBn: Math.round(importUsdM / 1000),
      importDependencePct: Math.round((1 - indigenousMmt / processedMmt) * 100),
      indigenousMmt: Math.round(indigenousMmt * 10) / 10,
      processedMmt: Math.round(processedMmt),
    };
  } catch {
    return null;
  }
}

export const getPpacCrudeBalance = unstable_cache(fetchPpacCrudeBalance, ["urja-ppac-crude-balance"], {
  revalidate: 86_400,
  tags: ["urja-ppac"],
});
