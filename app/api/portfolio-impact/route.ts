import { NextResponse } from "next/server";
import { getDailyCloses } from "@/lib/market";

// Portfolio-fit analysis for the dissected stock: how it correlates with a
// user's holdings and what it does to concentration. Correlations are computed
// from free daily-close history — no paid provider.
export const dynamic = "force-dynamic";

type Holding = { symbol: string; weight: number };

function toReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  return r;
}

function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 20) return null;
  const x = a.slice(-n);
  const y = b.slice(-n);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a1 = x[i] - mx;
    const b1 = y[i] - my;
    num += a1 * b1;
    dx += a1 * a1;
    dy += b1 * b1;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : Math.max(-1, Math.min(1, num / den));
}

export async function POST(request: Request) {
  let body: { base?: string; holdings?: Holding[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const base = typeof body.base === "string" ? body.base : "";
  const holdings = (Array.isArray(body.holdings) ? body.holdings : [])
    .filter((h) => h && typeof h.symbol === "string" && h.symbol.trim())
    .slice(0, 12)
    .map((h) => ({ symbol: h.symbol.trim().toUpperCase(), weight: Number(h.weight) || 0 }));

  if (!base || !holdings.length) {
    return NextResponse.json({ error: "Need a base symbol and at least one holding." }, { status: 400 });
  }

  const norm = (s: string) => (/\.(NS|BO)$/.test(s) ? s : `${s}.NS`);
  const [baseCloses, ...holdingCloses] = await Promise.all([
    getDailyCloses(norm(base)),
    ...holdings.map((h) => getDailyCloses(norm(h.symbol))),
  ]);

  if (!baseCloses) {
    return NextResponse.json({ error: "Couldn't load price history for the stock." }, { status: 502 });
  }
  const baseRet = toReturns(baseCloses);

  const totalWeight = holdings.reduce((s, h) => s + h.weight, 0) || 1;
  const rows = holdings.map((h, i) => {
    const closes = holdingCloses[i];
    const corr = closes ? pearson(baseRet, toReturns(closes)) : null;
    return { symbol: h.symbol, weight: h.weight, corr };
  });

  // Weighted average correlation of the stock vs the portfolio.
  const weighted = rows.filter((r) => r.corr != null);
  const portfolioCorr =
    weighted.length > 0
      ? weighted.reduce((s, r) => s + (r.corr as number) * r.weight, 0) /
        (weighted.reduce((s, r) => s + r.weight, 0) || 1)
      : null;

  // Concentration: HHI + largest holding after adding the base at an example 10%.
  const weights = holdings.map((h) => h.weight / totalWeight);
  const hhi = weights.reduce((s, w) => s + w * w, 0); // 0..1 (higher = concentrated)
  const topWeight = Math.max(...holdings.map((h) => (h.weight / totalWeight) * 100));

  return NextResponse.json({
    rows,
    portfolioCorr,
    diversification: portfolioCorr != null ? 1 - portfolioCorr : null,
    hhi,
    topWeightPct: topWeight,
    count: holdings.length,
  });
}
