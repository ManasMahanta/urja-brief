// ============================================================================
// Intelligence-OS content model.
//
// The homepage narrative blends two data sources:
//   • LIVE   — real feeds from lib/market.ts (indices, movers, sectors, news).
//   • DEMO   — the representative datasets below, for capabilities that have no
//              backend yet (relationship graph, portfolio, institutional
//              signals, deep-research artefacts). Everything here is clearly
//              badged "SAMPLE" in the UI via <DemoBadge />. None of it is real
//              market data and none of it is investment advice.
//
// Kept deterministic (no Math.random at module scope) so server and client
// renders match and hydration stays clean.
// ============================================================================

export type Direction = "up" | "down" | "flat";

export function dirOf(pct: number): Direction {
  if (pct > 0.05) return "up";
  if (pct < -0.05) return "down";
  return "flat";
}

// ---- Section 1 — What Happened --------------------------------------------

export type SectorNote = {
  sector: string;
  changePct: number; // demo fallback if live is unavailable
  driver: string; // the one-line "why"
  weight: number; // relative index weight, for heatmap sizing (0..1)
};

// Demo fallback / enrichment for the sector heatmap. Live sector % overrides
// changePct when available; the driver copy is editorial context.
export const SECTOR_NOTES: SectorNote[] = [
  { sector: "IT", changePct: 1.9, driver: "US CPI cooled — rate-cut odds lifted exporters", weight: 0.9 },
  { sector: "Bank", changePct: 0.8, driver: "Credit growth steady; NIM worries easing", weight: 1.0 },
  { sector: "Auto", changePct: 1.2, driver: "Festive dispatch numbers beat estimates", weight: 0.6 },
  { sector: "Pharma", changePct: 0.4, driver: "USFDA clearances; defensive rotation", weight: 0.5 },
  { sector: "FMCG", changePct: -0.3, driver: "Rural demand still patchy", weight: 0.7 },
  { sector: "Energy", changePct: -0.9, driver: "Crude firmed on supply cuts", weight: 0.8 },
  { sector: "Metal", changePct: -1.4, driver: "China demand read soft; LME slipped", weight: 0.55 },
  { sector: "Realty", changePct: 2.3, driver: "Pre-sales momentum + rate-cut hopes", weight: 0.3 },
];

export type RecapStat = { label: string; value: string; sub: string; dir: Direction };

export const MARKET_RECAP: RecapStat[] = [
  { label: "Advance / Decline", value: "1,842 / 1,401", sub: "Breadth positive", dir: "up" },
  { label: "FII flows (cash)", value: "+₹2,340 Cr", sub: "Net buyers, 3rd day", dir: "up" },
  { label: "DII flows (cash)", value: "−₹610 Cr", sub: "Booking profits", dir: "down" },
  { label: "India VIX", value: "12.8", sub: "−4.1% · complacent", dir: "up" },
];

// ---- Section 2 — Why It Happened ------------------------------------------

export type GraphNode = {
  id: string;
  label: string;
  kind: "macro" | "sector" | "stock" | "event";
  x: number; // 0..100 layout coords
  y: number;
};
export type GraphEdge = { from: string; to: string; effect: "positive" | "negative"; note: string };

export const CAUSE_GRAPH: { nodes: GraphNode[]; edges: GraphEdge[] } = {
  nodes: [
    { id: "cpi", label: "US CPI cools", kind: "event", x: 12, y: 22 },
    { id: "fed", label: "Fed cut odds ↑", kind: "macro", x: 12, y: 66 },
    { id: "dxy", label: "Dollar weakens", kind: "macro", x: 40, y: 20 },
    { id: "fii", label: "FII inflows", kind: "macro", x: 40, y: 62 },
    { id: "it", label: "Nifty IT", kind: "sector", x: 70, y: 18 },
    { id: "bank", label: "Bank Nifty", kind: "sector", x: 70, y: 50 },
    { id: "infy", label: "Infosys", kind: "stock", x: 92, y: 14 },
    { id: "tcs", label: "TCS", kind: "stock", x: 92, y: 34 },
    { id: "hdfc", label: "HDFC Bank", kind: "stock", x: 92, y: 58 },
  ],
  edges: [
    { from: "cpi", to: "fed", effect: "positive", note: "Softer inflation lifts cut expectations" },
    { from: "fed", to: "dxy", effect: "negative", note: "Lower US yields weigh on the dollar" },
    { from: "fed", to: "fii", effect: "positive", note: "EM risk appetite improves" },
    { from: "dxy", to: "it", effect: "positive", note: "Weaker $ ≠ headwind, rate-cut demand read" },
    { from: "fii", to: "bank", effect: "positive", note: "Financials are the flow proxy" },
    { from: "it", to: "infy", effect: "positive", note: "High-beta exporter" },
    { from: "it", to: "tcs", effect: "positive", note: "Sector leader re-rates" },
    { from: "bank", to: "hdfc", effect: "positive", note: "Index-heavyweight lift" },
  ],
};

export type NewsCluster = { theme: string; count: number; sentiment: Direction; blurb: string };
export const NEWS_CLUSTERS: NewsCluster[] = [
  { theme: "Rate-cut expectations", count: 34, sentiment: "up", blurb: "Global cues dominate the tape as CPI prints soften." },
  { theme: "Q2 earnings season", count: 28, sentiment: "up", blurb: "IT & autos beating; margins the swing factor." },
  { theme: "Crude & OMCs", count: 17, sentiment: "down", blurb: "Supply-cut headlines pressure oil marketers." },
  { theme: "IPO pipeline", count: 12, sentiment: "flat", blurb: "Three mainboard issues open next week." },
];

export type TimelineEvent = { date: string; label: string; impact: "high" | "med" | "low"; kind: string };
export const EVENT_TIMELINE: TimelineEvent[] = [
  { date: "Mon", label: "US CPI print", impact: "high", kind: "Macro" },
  { date: "Tue", label: "Infosys Q2 results", impact: "high", kind: "Earnings" },
  { date: "Wed", label: "RBI MPC minutes", impact: "med", kind: "Policy" },
  { date: "Thu", label: "US FOMC decision", impact: "high", kind: "Macro" },
  { date: "Fri", label: "Reliance AGM", impact: "med", kind: "Corporate" },
];

// ---- Section 3 — What Matters Today ---------------------------------------

export type PriorityCard = {
  rank: number;
  tag: "Earnings" | "Policy" | "Insider" | "Institutional" | "Technical";
  title: string;
  why: string;
  action: string; // research action, per compliance framing
  confidence: number; // 0..100
};

export const PRIORITY_CARDS: PriorityCard[] = [
  {
    rank: 1,
    tag: "Earnings",
    title: "Infosys reports after close",
    why: "Guidance revision is the swing factor for the whole IT basket; street models a 20–40bps margin lift.",
    action: "Read the deal-TCV and margin commentary before the sector re-rates.",
    confidence: 82,
  },
  {
    rank: 2,
    tag: "Institutional",
    title: "FIIs net buyers 3 sessions running",
    why: "₹6,900 Cr cumulative into financials & IT — the first sustained inflow streak in six weeks.",
    action: "Track whether banks confirm the flow with a breadth thrust.",
    confidence: 74,
  },
  {
    rank: 3,
    tag: "Policy",
    title: "FOMC decision Thursday",
    why: "A dovish dot-plot would extend the EM bid; a hawkish hold caps the rally into expiry.",
    action: "Size risk around the event, not into it.",
    confidence: 68,
  },
  {
    rank: 4,
    tag: "Insider",
    title: "Promoter buying flagged in 2 mid-caps",
    why: "Bulk-deal disclosures show promoter-entity accumulation near 52-week support.",
    action: "Cross-check the filings; insider buys ≠ a floor.",
    confidence: 61,
  },
];

export type SignalRow = {
  symbol: string;
  name: string;
  signal: string;
  detail: string;
  strength: number; // 0..100
  dir: Direction;
};

export const INSTITUTIONAL_SIGNALS: SignalRow[] = [
  { symbol: "ICICIBANK", name: "ICICI Bank", signal: "Block accumulation", detail: "3 blocks · ₹1,240 Cr · avg ₹1,142", strength: 88, dir: "up" },
  { symbol: "INFY", name: "Infosys", signal: "FII add", detail: "+1.2% holding QoQ (est.)", strength: 71, dir: "up" },
  { symbol: "TATAMOTORS", name: "Tata Motors", signal: "Delivery volume spike", detail: "2.1× 20-day avg", strength: 66, dir: "up" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", signal: "DII trim", detail: "−0.6% holding QoQ (est.)", strength: 54, dir: "down" },
];

export const INSIDER_ALERTS: SignalRow[] = [
  { symbol: "LT", name: "Larsen & Toubro", signal: "Promoter pledge released", detail: "1.4% of holding un-pledged", strength: 72, dir: "up" },
  { symbol: "ADANIENT", name: "Adani Enterprises", signal: "Insider sale", detail: "Designated person · ₹58 Cr", strength: 48, dir: "down" },
  { symbol: "TITAN", name: "Titan", signal: "Promoter buy", detail: "Open-market · ₹210 Cr", strength: 69, dir: "up" },
];

export type EarningsRow = { symbol: string; name: string; when: string; estEps: string; whisper: Direction };
export const EARNINGS_CAL: EarningsRow[] = [
  { symbol: "INFY", name: "Infosys", when: "Today · post", estEps: "₹16.8", whisper: "up" },
  { symbol: "HDFCBANK", name: "HDFC Bank", when: "Sat · pre", estEps: "₹22.4", whisper: "flat" },
  { symbol: "RELIANCE", name: "Reliance", when: "Mon · post", estEps: "₹28.1", whisper: "up" },
  { symbol: "MARUTI", name: "Maruti Suzuki", when: "Tue · post", estEps: "₹98.5", whisper: "up" },
];

// ---- Section 4 — AI Deep Research -----------------------------------------

export type ThesisSection = { heading: string; body: string };
export type DeepResearch = {
  symbol: string;
  name: string;
  verdict: "Constructive" | "Neutral" | "Cautious";
  conviction: number; // 0..100
  priceContext: string;
  thesis: ThesisSection[];
  financials: { metric: string; value: string; yoy: string; dir: Direction }[];
  risks: { label: string; severity: number; note: string }[];
  callSummary: string; // "earnings call summarizer" demo output
};

export const DEEP_RESEARCH: DeepResearch = {
  symbol: "TCS",
  name: "Tata Consultancy Services",
  verdict: "Constructive",
  conviction: 76,
  priceContext: "Trading near the upper half of its 1-yr range; premium to peers intact.",
  thesis: [
    { heading: "What the business is", body: "India's largest IT-services exporter — run-the-business + change-the-business work for global enterprises, priced mostly in USD." },
    { heading: "Why it could re-rate", body: "A dollar-softening, rate-cut backdrop tends to revive discretionary tech spend. Deal TCV and BFSI commentary are the leading indicators to watch." },
    { heading: "What would break it", body: "A US recession that freezes enterprise budgets, or a sharp rupee appreciation compressing reported margins." },
  ],
  financials: [
    { metric: "Revenue (TTM)", value: "₹2.44 L Cr", yoy: "+6.8%", dir: "up" },
    { metric: "EBIT margin", value: "24.3%", yoy: "+40 bps", dir: "up" },
    { metric: "Deal TCV (Q)", value: "$8.1 B", yoy: "+12%", dir: "up" },
    { metric: "Attrition (LTM)", value: "12.1%", yoy: "−250 bps", dir: "up" },
  ],
  risks: [
    { label: "Discretionary demand", severity: 62, note: "Enterprise budgets sensitive to US macro." },
    { label: "Currency (INR/USD)", severity: 41, note: "Reported margin swings with the rupee." },
    { label: "Valuation", severity: 55, note: "Premium multiple leaves little room for a miss." },
    { label: "Client concentration", severity: 28, note: "BFSI vertical is the swing exposure." },
  ],
  callSummary:
    "Management struck a measured tone: demand ‘stable, not accelerating,’ with BFSI stabilising and a healthy book-to-bill. Margin levers (pyramid, utilisation, lower attrition) intact; no change to the medium-term aspiration. Cautious optimism on FY discretionary recovery.",
};

// Starter prompts for the conversational panel.
export const RESEARCH_PROMPTS = [
  "Explain what actually moves TCS's stock",
  "Summarise the latest Infosys earnings call",
  "What are the risks in ICICI Bank right now?",
  "Compare HDFC Bank vs ICICI Bank on fundamentals",
];

// ---- Section 5 — Portfolio Intelligence -----------------------------------

export type Holding = { symbol: string; name: string; weight: number; pnlPct: number; sector: string };
export const DEMO_PORTFOLIO: Holding[] = [
  { symbol: "RELIANCE", name: "Reliance", weight: 22, pnlPct: 14.2, sector: "Energy" },
  { symbol: "HDFCBANK", name: "HDFC Bank", weight: 18, pnlPct: 6.1, sector: "Bank" },
  { symbol: "TCS", name: "TCS", weight: 16, pnlPct: 21.7, sector: "IT" },
  { symbol: "INFY", name: "Infosys", weight: 12, pnlPct: -3.4, sector: "IT" },
  { symbol: "ICICIBANK", name: "ICICI Bank", weight: 11, pnlPct: 18.9, sector: "Bank" },
  { symbol: "MARUTI", name: "Maruti", weight: 9, pnlPct: 8.8, sector: "Auto" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", weight: 7, pnlPct: 2.3, sector: "Pharma" },
  { symbol: "TATASTEEL", name: "Tata Steel", weight: 5, pnlPct: -7.6, sector: "Metal" },
];

// Risk radar axes (0..100; higher = more exposure/risk).
export const RISK_RADAR = [
  { axis: "Concentration", value: 72 },
  { axis: "Volatility", value: 48 },
  { axis: "Cyclicality", value: 63 },
  { axis: "Rate sensitivity", value: 55 },
  { axis: "FX exposure", value: 41 },
  { axis: "Liquidity", value: 22 },
];

export type Scenario = { id: string; label: string; portfolioPct: number; note: string };
export const SCENARIOS: Scenario[] = [
  { id: "cut", label: "Fed cuts 25bps", portfolioPct: 3.4, note: "IT + rate-sensitives lead" },
  { id: "hold", label: "Hawkish hold", portfolioPct: -2.1, note: "High-beta gives back" },
  { id: "crude", label: "Crude +15%", portfolioPct: -1.3, note: "Energy up, autos hurt" },
  { id: "inr", label: "INR depreciates 3%", portfolioPct: 1.8, note: "Exporters cushion" },
];

export type Recommendation = { symbol: string; action: string; rationale: string; tone: Direction };
export const PORTFOLIO_RECS: Recommendation[] = [
  { symbol: "Portfolio", action: "Trim IT concentration", rationale: "28% in two IT names — single-vertical event risk into results.", tone: "down" },
  { symbol: "TATASTEEL", action: "Review metals exposure", rationale: "China demand read soft; position is your weakest sleeve.", tone: "down" },
  { symbol: "Cash", action: "Keep ~6% dry powder", rationale: "FOMC + earnings cluster favours optionality this week.", tone: "flat" },
];

// ---- Section 6 — Market Opportunities -------------------------------------

export type Opportunity = {
  symbol: string;
  name: string;
  score: number; // 0..100 composite
  tags: string[];
  thesis: string;
};

export const HIDDEN_GEMS: Opportunity[] = [
  { symbol: "POWERGRID", name: "Power Grid", score: 84, tags: ["Quality", "Yield"], thesis: "Regulated returns, capex tailwind, steady dividend — a low-drama compounder." },
  { symbol: "SUNPHARMA", name: "Sun Pharma", score: 79, tags: ["Defensive", "Specialty"], thesis: "Specialty pipeline de-risks the US generic cycle." },
];

export const MOMENTUM: Opportunity[] = [
  { symbol: "TATAMOTORS", name: "Tata Motors", score: 88, tags: ["Momentum", "Delivery beat"], thesis: "JLR mix + domestic dispatches driving upgrades; above all key MAs." },
  { symbol: "ADANIENT", name: "Adani Enterprises", score: 81, tags: ["High-beta"], thesis: "Sharp breadth-led move; treat as high-volatility." },
];

export const VALUE: Opportunity[] = [
  { symbol: "SBIN", name: "State Bank of India", score: 77, tags: ["Value", "Franchise"], thesis: "Cheapest way to own the credit cycle; ROA at a decade high." },
  { symbol: "NTPC", name: "NTPC", score: 73, tags: ["Value", "Green pivot"], thesis: "Re-rating on renewables optionality at a utility multiple." },
];

export type RotationRow = { from: string; to: string; strength: number };
export const SECTOR_ROTATION: RotationRow[] = [
  { from: "FMCG", to: "IT", strength: 78 },
  { from: "Metal", to: "Realty", strength: 64 },
  { from: "Energy", to: "Auto", strength: 52 },
];
