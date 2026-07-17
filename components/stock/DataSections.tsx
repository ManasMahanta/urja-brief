// Data-driven sections. Technical + Financial Health + Ownership now use REAL
// data from the free Yahoo crumb path (lib/yahoo-fundamentals). Competitive
// still needs a peer-mapping provider and stays an honest placeholder.

import type { Quote } from "@/lib/market";
import { formatPrice } from "@/lib/market";
import type { Technicals } from "@/lib/stock-ai";
import type { Fundamentals, Indicators, PeerRow, Holder } from "@/lib/yahoo-fundamentals";
import Block from "@/components/stock/Block";
import { LiveBadge, DemoBadge } from "@/components/intel/ui";

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-mute">{label}</span>
        <span className="tabular font-mono text-white">{value}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

const parsePct = (s?: string): number | null => {
  if (!s) return null;
  const n = parseFloat(s.replace("%", ""));
  return Number.isFinite(n) ? n : null;
};

/* --- 13. Technical Intelligence (real levels + real indicators) -------- */
export function TechnicalPanel({ quote, t, ind }: { quote: Quote; t: Technicals; ind: Indicators | null }) {
  const cur = quote.currency;
  const rsi = ind?.rsi14;
  const rsiTone = rsi == null ? "text-text-dim" : rsi >= 70 ? "text-down" : rsi <= 30 ? "text-up" : "text-white";
  const osc: [string, string, string][] = [
    ["RSI (14)", rsi != null ? String(rsi) : "—", rsiTone],
    ["MACD", ind?.macd ?? "—", ind?.macd === "bullish" ? "text-up" : ind?.macd === "bearish" ? "text-down" : "text-text-dim"],
    ["MA cross", ind?.maCross ?? "—", ind?.maCross === "golden" ? "text-up" : ind?.maCross === "death" ? "text-down" : "text-text-dim"],
    ["50-day MA", ind?.fiftyDay != null ? formatPrice(ind.fiftyDay, cur) : "—", "text-white"],
    ["200-day MA", ind?.twoHundredDay != null ? formatPrice(ind.twoHundredDay, cur) : "—", "text-white"],
    ["vs 200-DMA", ind?.twoHundredDay != null ? `${(((quote.price - ind.twoHundredDay) / ind.twoHundredDay) * 100).toFixed(1)}%` : "—", ind?.twoHundredDay != null && quote.price >= ind.twoHundredDay ? "text-up" : "text-down"],
  ];
  const anyOsc = rsi != null || ind?.macd || ind?.fiftyDay != null;
  return (
    <Block id="technical" index="13" kicker="Technical intelligence" title="Price structure" badge={<LiveBadge />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white">Levels & position</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["Support (day/52w low)", t.support != null ? formatPrice(t.support, cur) : "—"],
              ["Resistance (day/52w high)", t.resistance != null ? formatPrice(t.resistance, cur) : "—"],
              ["Volume", t.volume != null ? t.volume.toLocaleString("en-IN") : "—"],
              ["Trend", t.trend],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                <p className="text-[0.6rem] uppercase tracking-wider text-text-mute">{k}</p>
                <p className="tabular mt-1 font-mono text-sm font-semibold text-white">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <Bar label="Position in day range" value={t.dayPosition} />
            <Bar label="Position in 52-week range" value={t.rangePosition} />
          </div>
        </div>

        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Oscillators & averages</h3>
            {anyOsc ? <LiveBadge /> : <DemoBadge label="Unavailable" />}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {osc.map(([k, v, tone]) => (
              <div key={k} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                <p className="text-[0.56rem] uppercase tracking-wider text-text-mute">{k}</p>
                <p className={`mt-1 font-mono text-sm font-semibold capitalize ${tone}`}>{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.68rem] leading-snug text-text-mute">
            RSI/MACD computed from 6 months of daily closes; moving averages from
            Yahoo. Options positioning still needs an options feed.
          </p>
        </div>
      </div>
    </Block>
  );
}

/* --- 7. Financial Health Command Center (real) ------------------------- */
export function FinancialHealth({ f }: { f: Fundamentals | null }) {
  const groups: { title: string; rows: [string, string | undefined][] }[] = [
    {
      title: "Profitability",
      rows: [
        ["Return on equity", f?.roe],
        ["Return on assets", f?.roa],
        ["Profit margin", f?.profitMargin],
        ["Operating margin", f?.operatingMargin],
        ["Gross margin", f?.grossMargin],
      ],
    },
    {
      title: "Growth",
      rows: [
        ["Revenue (TTM)", f?.totalRevenue],
        ["Revenue growth", f?.revenueGrowth],
        ["Earnings growth", f?.earningsGrowth],
      ],
    },
    {
      title: "Balance sheet",
      rows: [
        ["Debt / equity", f?.debtToEquity],
        ["Current ratio", f?.currentRatio],
        ["Total cash", f?.totalCash],
        ["Total debt", f?.totalDebt],
        ["Free cash flow", f?.freeCashflow],
      ],
    },
  ];
  const any = groups.some((g) => g.rows.some(([, v]) => v));
  return (
    <Block id="financials" index="07" kicker="Financial health" title="The numbers" badge={any ? <LiveBadge /> : <DemoBadge label="Unavailable" />}>
      {any ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title} className="glass p-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-sky-300">{g.title}</p>
              <ul className="mt-3 divide-y divide-white/8">
                {g.rows.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-text-mute">{k}</span>
                    <span className="tabular font-mono text-text-dim">{v ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="glass p-5 text-sm text-text-mute">Fundamentals unavailable for this symbol right now.</p>
      )}
    </Block>
  );
}

/* --- 4. Smart Money — real ownership split + named holders ------------- */
export function SmartMoney({ f, holders = [] }: { f: Fundamentals | null; holders?: Holder[] }) {
  const insiders = parsePct(f?.insidersPct);
  const inst = parsePct(f?.institutionsPct);
  const hasReal = insiders != null || inst != null;
  const publicPct = insiders != null && inst != null ? Math.max(0, 100 - insiders - inst) : null;

  return (
    <Block id="smart-money" index="04" kicker="Smart money" title="Who owns it" badge={hasReal ? <LiveBadge /> : <DemoBadge label="Unavailable" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white">Ownership split</h3>
          {hasReal ? (
            <div className="mt-4 space-y-4">
              {insiders != null && <Bar label="Insiders / promoters" value={insiders} />}
              {inst != null && <Bar label="Institutions (FII/DII/MF)" value={inst} />}
              {publicPct != null && <Bar label="Public & others" value={publicPct} />}
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-white/8">
              {["Promoters", "Institutions", "Public & others"].map((r) => (
                <li key={r} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-text-dim">{r}</span>
                  <span className="font-mono text-xs text-text-mute">—</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Top institutional holders</h3>
            {holders.length ? <LiveBadge /> : <DemoBadge label="Not listed" />}
          </div>
          {holders.length ? (
            <ul className="mt-4 divide-y divide-white/8">
              {holders.map((h) => (
                <li key={h.name} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-sm text-text-dim">{h.name}</span>
                  <span className="tabular shrink-0 font-mono text-xs text-white">{h.pct ?? "—"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-text-mute">
              Named holders aren&apos;t published for this listing (common for
              Indian stocks). The split at left is live.
            </p>
          )}
        </div>
      </div>
    </Block>
  );
}

/* --- 6. Competitive Landscape (real peers + fundamentals) -------------- */
export function Competitive({
  self,
  peers,
}: {
  self: { symbol: string; name: string; row: PeerRow };
  peers: PeerRow[];
}) {
  const cols: [string, keyof PeerRow][] = [
    ["Market cap", "marketCap"],
    ["P/E", "trailingPE"],
    ["ROE", "roe"],
    ["Op. margin", "operatingMargin"],
    ["Rev. growth", "revenueGrowth"],
  ];
  const rows: { label: string; symbol: string; data: PeerRow; self: boolean }[] = [
    { label: self.name, symbol: self.symbol.replace(/\.(NS|BO)$/, ""), data: self.row, self: true },
    ...peers.map((p) => ({ label: p.name, symbol: p.symbol, data: p, self: false })),
  ];

  return (
    <Block id="competitive" index="06" kicker="Competitive landscape" title="Versus peers" badge={peers.length ? <LiveBadge /> : <DemoBadge label="Unavailable" />}>
      {peers.length ? (
        <>
          <div className="glass overflow-x-auto p-5 scroll-thin">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left font-mono text-[0.58rem] uppercase tracking-wider text-text-mute">
                  <th className="pb-2 pr-4">Company</th>
                  {cols.map(([c]) => (
                    <th key={c} className="px-2 pb-2 text-right">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.symbol} className={`border-t border-white/8 ${r.self ? "bg-sky-400/[0.05]" : ""}`}>
                    <td className={`py-2.5 pr-4 ${r.self ? "font-semibold text-white" : "text-text-dim"}`}>
                      <span className="font-mono text-xs">{r.symbol}</span>
                      <span className="ml-2 hidden text-xs text-text-mute sm:inline">{r.data.name}</span>
                    </td>
                    {cols.map(([, key]) => (
                      <td key={key} className={`px-2 py-2.5 text-right font-mono tabular ${r.self ? "text-white" : "text-text-mute"}`}>
                        {r.data[key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.68rem] leading-snug text-text-mute">
            Peers via Yahoo&apos;s similarity graph, same-sector first; fundamentals
            live. Ask the AI copilot below for a qualitative head-to-head.
          </p>
        </>
      ) : (
        <p className="glass p-5 text-sm text-text-mute">
          Couldn&apos;t resolve peers for this symbol. The AI copilot below can still
          compare it to any company qualitatively.
        </p>
      )}
    </Block>
  );
}
