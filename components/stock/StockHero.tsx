import type { Quote } from "@/lib/market";
import { formatPrice } from "@/lib/market";
import type { Dissection, Technicals, Rating } from "@/lib/stock-ai";
import type { Fundamentals } from "@/lib/yahoo-fundamentals";
import StockChart from "@/components/stock/StockChart";
import { Delta, ScoreRing, DemoBadge, LiveBadge } from "@/components/intel/ui";

const RATING_TONE: Record<Rating, string> = {
  Buy: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  Accumulate: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  Hold: "text-sky-300 border-sky-400/30 bg-sky-400/10",
  Reduce: "text-rose-300 border-rose-400/30 bg-rose-400/10",
  Avoid: "text-rose-300 border-rose-400/30 bg-rose-400/10",
};

function Chip({ label, value, ai }: { label: string; value: string; ai?: boolean }) {
  return (
    <div className="glass px-3 py-2">
      <p className="flex items-center gap-1 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-text-mute">
        {label}
        {ai && <span className="text-violet-300">·AI</span>}
      </p>
      <p className="tabular mt-0.5 font-mono text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export default function StockHero({
  quote,
  data,
  technicals,
  fundamentals,
  aiLive,
}: {
  quote: Quote;
  data: Dissection;
  technicals: Technicals;
  fundamentals: Fundamentals | null;
  aiLive: boolean;
}) {
  const up = quote.changePercent >= 0;
  const cur = quote.currency;
  const f = fundamentals;
  const sector = f?.sector ?? data.sector;
  const industry = f?.industry ?? data.industry;
  const identity = [f?.ceo, f?.hq, f?.employees && `${f.employees} employees`].filter(Boolean).join(" · ");
  const fundRows: [string, string | undefined][] = [
    ["Market cap", f?.marketCap],
    ["P/E", f?.trailingPE],
    ["EPS", f?.eps],
    ["Div yield", f?.dividendYield],
    ["Beta", f?.beta],
    ["P/B", f?.priceToBook],
  ];
  const hasFund = f && fundRows.some(([, v]) => v);
  const range52 =
    quote.week52Low && quote.week52High
      ? `${formatPrice(quote.week52Low, cur)} – ${formatPrice(quote.week52High, cur)}`
      : "—";
  const dayRange =
    quote.dayLow && quote.dayHigh
      ? `${formatPrice(quote.dayLow, cur)} – ${formatPrice(quote.dayHigh, cur)}`
      : "—";

  return (
    <section id="hero" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: identity + price + chart */}
        <div className="glass p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-white">
                  {quote.symbol.replace(/\.(NS|BO)$/, "")}
                </span>
                <LiveBadge />
              </div>
              <p className="mt-0.5 truncate text-sm text-text-dim">{quote.name}</p>
              {identity && <p className="mt-0.5 truncate text-xs text-text-mute">{identity}</p>}
            </div>
            <div className="text-right">
              <p className="tabular font-mono text-2xl font-bold text-white sm:text-3xl">
                {formatPrice(quote.price, cur)}
              </p>
              <Delta pct={quote.changePercent} className="justify-end text-sm" />
            </div>
          </div>

          {/* AI one-liner */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.05] p-3">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-violet-400 shadow-[0_0_8px_1px_rgba(167,139,250,0.7)]" />
            <p className="text-sm leading-relaxed text-text-dim">{data.summary}</p>
          </div>

          {/* Chart */}
          <div className="mt-4">
            <StockChart data={quote.spark ?? []} up={up} height={130} />
          </div>

          {/* Real data chips */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Chip label="Exchange" value={quote.exchange || "—"} />
            <Chip label="Currency" value={cur} />
            <Chip label="Day range" value={dayRange} />
            <Chip label="52-week range" value={range52} />
            <Chip label="Sector" value={sector} ai={!f?.sector} />
            <Chip label="Industry" value={industry} ai={!f?.industry} />
          </div>
        </div>

        {/* Right: AI rating + valuation */}
        <div className="flex flex-col gap-5">
          <div className="glass rail p-5" style={{ ["--rail" as string]: "#a78bfa" }}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> AI investment rating
              </p>
              <DemoBadge label={aiLive ? "AI analysis" : "AI offline"} />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <ScoreRing value={data.confidence} size={68} />
              <div>
                <span className={`inline-flex rounded-lg border px-2.5 py-1 text-sm font-bold ${RATING_TONE[data.rating]}`}>
                  {data.rating}
                </span>
                <p className="mt-1.5 font-mono text-[0.62rem] uppercase tracking-wider text-text-mute">
                  {data.confidence}% confidence
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-text-dim">{data.fairValue}</p>
          </div>

          {/* Range position (real) */}
          <div className="glass p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Position in 52-week range</h3>
              <LiveBadge />
            </div>
            <div className="mt-4">
              <div className="relative h-2 w-full rounded-full bg-white/8">
                <div
                  className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.6)]"
                  style={{ left: `calc(${technicals.rangePosition}% - 2px)` }}
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[0.6rem] text-text-mute">
                <span>52w low</span>
                <span className="text-white">{technicals.rangePosition}%</span>
                <span>52w high</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-mute">
              {technicals.distToHigh != null && `${technicals.distToHigh.toFixed(1)}% below the 1-year high · `}
              trend {technicals.trend}
            </p>
          </div>

          {/* Fundamentals — real (Yahoo) with graceful fallback */}
          <div className="glass p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Fundamentals</h3>
              {hasFund ? <LiveBadge /> : <DemoBadge label="Unavailable" />}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {fundRows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2">
                  <span className="text-text-mute">{k}</span>
                  <span className="tabular font-mono text-text-dim">{v ?? "—"}</span>
                </div>
              ))}
            </div>
            {f?.recommendation && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-sky-400/20 bg-sky-400/[0.06] px-3 py-2">
                <span className="font-mono text-[0.6rem] uppercase tracking-wider text-sky-300">
                  Analyst consensus
                </span>
                <span className="text-xs font-semibold capitalize text-white">
                  {f.recommendation.replace(/_/g, " ")}
                  {f.numAnalysts && <span className="ml-1 font-normal text-text-mute">· {f.numAnalysts} analysts</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
