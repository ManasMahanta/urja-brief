// Coal-stock desk — the fuel-supply story behind the grid. Coal runs ~70% of
// India's generation, and when plant stocks thin out, that's the real
// precursor to load-shedding. The CEA's Fuel Management Division publishes a
// DAILY coal stock report, but only as a PDF at a predictable NPP URL. We fetch
// the latest available (it lags ~1 day), extract the national summary line with
// unpdf, and cache it. No paid feed, no scraping a dashboard — the official
// document, parsed.

import { unstable_cache } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";

export type CoalStock = {
  asOn: string; // report date, DD-MM-YYYY (IST)
  capacityMw: number; // coal capacity monitored
  totalStockKt: number; // actual stock, '000 tonnes
  domesticKt: number;
  importKt: number;
  dailyRequirementKt: number; // at 85% PLF
  normativeKt: number; // the stock the fleet is supposed to hold
  pctOfNormative: number;
  criticalPlants: number; // plants below 25% of normative
  daysOfStock: number; // derived: totalStock ÷ daily requirement
  reportUrl: string;
};

const pad = (n: string) => n;

function istYmd(daysAgo: number): { y: string; m: string; d: string } {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(Date.now() - daysAgo * 86_400_000),
  ); // YYYY-MM-DD, `daysAgo` into the past (the report lags ~1 day)
  const [y, m, d] = s.split("-");
  return { y, m, d };
}

const coalUrl = (offsetDays: number) => {
  const { y, m, d } = istYmd(offsetDays);
  return `https://npp.gov.in/public-reports/cea/daily/fuel/${pad(d)}-${pad(m)}-${y}/dailyCoal1-${y}-${pad(m)}-${pad(d)}.pdf`;
};

function parseCoalReport(text: string, reportUrl: string): CoalStock | null {
  const asOn = text.match(/AS ON (\d{2}-\d{2}-\d{4})/)?.[1];
  // The "Grand Total = A+B+C+D" row carries the all-India figures in a fixed
  // column order: capacity, daily req, normative, domestic, import, total
  // actual stock, % of normative, then the count of critical plants.
  const g = text.match(
    /Grand Total = A\+B\+C\+D\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)%\s+(\d+)/,
  );
  if (!asOn || !g) return null;
  const [, cap, dailyReq, normative, domestic, imp, total, pct, critical] = g;
  const dailyRequirementKt = Number(dailyReq);
  const totalStockKt = Number(total);
  if (!(dailyRequirementKt > 0) || !(totalStockKt > 0)) return null;
  return {
    asOn,
    capacityMw: Number(cap),
    totalStockKt,
    domesticKt: Number(domestic),
    importKt: Number(imp),
    dailyRequirementKt,
    normativeKt: Number(normative),
    pctOfNormative: Number(pct),
    criticalPlants: Number(critical),
    daysOfStock: totalStockKt / dailyRequirementKt,
    reportUrl,
  };
}

async function fetchCoalStock(): Promise<CoalStock | null> {
  // The report is published a day in arrears and can slip; walk back a week
  // until one resolves. Returns null (never a stale number) if none do.
  for (let offset = 1; offset <= 5; offset++) {
    const url = coalUrl(offset);
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 UrjaBrief/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      const { text } = await extractText(await getDocumentProxy(buf), { mergePages: true });
      const parsed = parseCoalReport(text, url);
      if (parsed) return parsed;
    } catch {
      // try the previous day
    }
  }
  return null;
}

// Cached 6h — the report changes at most once a day, and PDF parsing is heavy.
export const getCoalStock = unstable_cache(fetchCoalStock, ["urja-coal-stock"], {
  revalidate: 21_600,
  tags: ["urja-coal"],
});
