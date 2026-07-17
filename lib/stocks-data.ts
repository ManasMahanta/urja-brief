// Curated coverage list — editorially maintained, not API-fetched. These are
// the stocks Bazaar Brief writes about most; the /coverage page renders whatever
// is here and enriches it with a live price column from lib/market.ts.
// Editorial notes only — nothing here is a buy/sell recommendation.

export const coverageLastReviewed = "2026-07-15";

export type CoveredStock = {
  name: string;
  symbol: string; // NSE ticker (no .NS suffix)
  sector: string;
  marketCap: "Large" | "Mid" | "Small";
  thesis: string; // one-line, neutral "what to watch" note
};

export const coveredStocks: CoveredStock[] = [
  {
    name: "Reliance Industries",
    symbol: "RELIANCE",
    sector: "Energy / Conglomerate",
    marketCap: "Large",
    thesis: "Watch the Jio + retail value-unlocking story against oil-to-chemicals margins.",
  },
  {
    name: "HDFC Bank",
    symbol: "HDFCBANK",
    sector: "Banking",
    marketCap: "Large",
    thesis: "Post-merger deposit growth and NIM trajectory are the numbers that move it.",
  },
  {
    name: "Tata Consultancy Services",
    symbol: "TCS",
    sector: "IT Services",
    marketCap: "Large",
    thesis: "Bellwether for IT: deal TCV, BFSI demand, and margin commentary set the sector tone.",
  },
  {
    name: "Infosys",
    symbol: "INFY",
    sector: "IT Services",
    marketCap: "Large",
    thesis: "Guidance revisions each quarter tend to reprice the whole IT pack.",
  },
  {
    name: "ICICI Bank",
    symbol: "ICICIBANK",
    sector: "Banking",
    marketCap: "Large",
    thesis: "Consistent credit growth and asset quality have made it a private-bank favourite.",
  },
  {
    name: "State Bank of India",
    symbol: "SBIN",
    sector: "Banking (PSU)",
    marketCap: "Large",
    thesis: "The PSU-bank proxy — credit costs and treasury gains swing earnings.",
  },
  {
    name: "Larsen & Toubro",
    symbol: "LT",
    sector: "Capital Goods",
    marketCap: "Large",
    thesis: "Order-book inflow is the tell on the domestic capex cycle.",
  },
  {
    name: "Bharti Airtel",
    symbol: "BHARTIARTL",
    sector: "Telecom",
    marketCap: "Large",
    thesis: "ARPU trend and tariff moves drive the telecom-recovery thesis.",
  },
  {
    name: "Maruti Suzuki",
    symbol: "MARUTI",
    sector: "Auto",
    marketCap: "Large",
    thesis: "Volumes, the SUV mix, and rural demand are the auto-cycle read-through.",
  },
  {
    name: "Tata Motors",
    symbol: "TATAMOTORS",
    sector: "Auto",
    marketCap: "Large",
    thesis: "JLR margins plus domestic CV/PV demand make it a high-beta auto name.",
  },
  {
    name: "Sun Pharma",
    symbol: "SUNPHARMA",
    sector: "Pharma",
    marketCap: "Large",
    thesis: "US specialty pipeline and USFDA news are the swing factors.",
  },
  {
    name: "Hindustan Unilever",
    symbol: "HINDUNILVR",
    sector: "FMCG",
    marketCap: "Large",
    thesis: "Volume growth and rural recovery are the FMCG demand barometer.",
  },
  {
    name: "Adani Enterprises",
    symbol: "ADANIENT",
    sector: "Infrastructure / Incubator",
    marketCap: "Large",
    thesis: "High-beta group flagship — news-flow and leverage keep it volatile.",
  },
  {
    name: "Bajaj Finance",
    symbol: "BAJFINANCE",
    sector: "NBFC",
    marketCap: "Large",
    thesis: "AUM growth and credit costs define the premium NBFC narrative.",
  },
  {
    name: "Titan",
    symbol: "TITAN",
    sector: "Consumer / Jewellery",
    marketCap: "Large",
    thesis: "Jewellery same-store growth and gold prices drive the discretionary story.",
  },
];
