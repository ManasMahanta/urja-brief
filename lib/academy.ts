// Curated learning tracks for Indian retail investors, organised by experience.
// Static editorial content (edit freely). Educational only — not advice.

export type LearnLevel = {
  id: string;
  level: string;
  who: string;
  summary: string;
  focus: string; // what to actually get right at this stage
  topics: string[];
  questions: string[]; // self-check questions to test understanding
};

export const learnLevels: LearnLevel[] = [
  {
    id: "beginner",
    level: "Beginner",
    who: "New to the market · first demat account · SIP curious",
    summary:
      "At this stage the goal isn't picking winners — it's not losing money to avoidable mistakes. Get the plumbing, the vocabulary, and the risk mindset right before a single stock pick.",
    focus:
      "Understand what you're buying, how the market is structured, and why low-cost, diversified, long-horizon investing beats chasing tips. Master the basics of a demat account, SIPs, and index funds first.",
    topics: [
      "How shares, exchanges (NSE/BSE), and the Nifty & Sensex actually work",
      "Demat + trading accounts, and how an order reaches the exchange",
      "Index funds and SIPs — why they're the sensible default core",
      "Reading a stock quote: price, change, volume, 52-week range, market cap",
      "Risk basics: diversification, position sizing, and only investing what you can hold",
      "How SEBI protects you — and why 'guaranteed returns' is always a red flag",
    ],
    questions: [
      "What's the difference between the Nifty 50 and the Sensex?",
      "Why does a SIP into an index fund suit most first-time investors?",
      "What does market capitalisation tell you, and how are large/mid/small caps defined?",
      "If a stock is at its 52-week high, is that a reason to buy? Why or why not?",
      "What does 'diversification' protect you from, and what does it not?",
      "Someone promises 3% returns per month, guaranteed. What should you do?",
    ],
  },
  {
    id: "intermediate",
    level: "Intermediate",
    who: "Comfortable with SIPs · starting to research individual stocks",
    summary:
      "You know the basics and want to understand businesses. This stage is about reading financials, valuing a company sensibly, and building a repeatable research process instead of acting on headlines.",
    focus:
      "Learn to read a company's numbers and judge whether a price is reasonable. Separate a good business from a good stock (price matters), and write down your reasoning before you act.",
    topics: [
      "Reading the three statements: P&L, balance sheet, cash flow — at a high level",
      "Core ratios: P/E, P/B, ROE, debt-to-equity, dividend yield — and their limits",
      "Valuation intuition: why P/E only means something within a sector",
      "Sectors and cycles: banks, IT, auto, pharma, FMCG — what drives each",
      "Reading an earnings result and the management commentary that moves the stock",
      "Building a watchlist and a written investment thesis you can revisit",
    ],
    questions: [
      "Why can a 'great company' still be a bad investment at the wrong price?",
      "What does ROE tell you, and why pair it with debt levels?",
      "Why is comparing the P/E of an IT firm to a bank misleading?",
      "In an earnings result, what matters more — the profit number or the guidance? Why?",
      "What would make you sell a stock you own? (Write the rule before you buy.)",
      "How does a rate cut by the RBI tend to affect banks vs. exporters?",
    ],
  },
  {
    id: "advanced",
    level: "Advanced",
    who: "Active investor · builds positions from own research",
    summary:
      "You run your own process. The edge now is discipline, second-order thinking, and understanding the flows and instruments that move prices — plus knowing where derivatives can quietly wreck a portfolio.",
    focus:
      "Think in probabilities and position sizing, understand how FII/DII flows and macro shape the tape, and use derivatives (if at all) with eyes open. Most of the work is behavioural, not analytical.",
    topics: [
      "FII/DII flows, global cues, the rupee, and crude as market drivers",
      "Macro: RBI policy, inflation, the bond yield curve, and the budget",
      "F&O basics done responsibly — leverage, expiry, and why most retail F&O loses",
      "Concentration vs. diversification, and sizing positions to survive being wrong",
      "Corporate actions: bonus, split, buyback, rights — and what they really change",
      "Behavioural traps: anchoring, recency, FOMO, and averaging down a broken thesis",
    ],
    questions: [
      "How can heavy FII selling move the Nifty even when company fundamentals are unchanged?",
      "Why do the majority of retail F&O traders lose money over time?",
      "A stock you own is down 30%. How do you decide whether to add, hold, or exit?",
      "What actually changes for a shareholder in a bonus issue vs. a buyback?",
      "How would a spike in crude oil ripple through different Indian sectors?",
      "Which of your recent decisions was luck, and which was process? How can you tell?",
    ],
  },
];
