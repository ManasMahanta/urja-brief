// Investing & markets glossary: plain-English definitions, editorially maintained.
// Sorted alphabetically at render time; just append new terms here.
// Educational only — nothing here is investment advice.

export type GlossaryTerm = {
  term: string;
  def: string;
};

// URL slug for a term's dedicated page, e.g. "Price-to-Earnings (P/E)" → "price-to-earnings".
export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ") // drop parenthetical abbreviations
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Look up a single term by its slug.
export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
  return glossary.find((t) => slugifyTerm(t.term) === slug);
}

// A few other terms to suggest from a term page — simple word-overlap ranking,
// so related definitions cross-link without a hand-maintained graph.
export function relatedTerms(term: GlossaryTerm, count = 4): GlossaryTerm[] {
  const stop = new Set([
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
    "that", "is", "are", "it", "its", "as", "at", "by", "be", "you", "your",
    "not", "into", "than", "from", "this", "each", "how", "why", "what", "one",
  ]);
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stop.has(w)),
    );
  const target = words(`${term.term} ${term.def}`);
  return glossary
    .filter((t) => t.term !== term.term)
    .map((t) => {
      const ws = words(`${t.term} ${t.def}`);
      let overlap = 0;
      for (const w of ws) if (target.has(w)) overlap += 1;
      return { t, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, count)
    .map((x) => x.t);
}

export const glossary: GlossaryTerm[] = [
  { term: "52-week high / low", def: "The highest and lowest price a stock has traded at over the past year. A quick gauge of where the current price sits in its recent range — not a signal on its own." },
  { term: "Ask price", def: "The lowest price a seller is currently willing to accept for a share. You buy at the ask; the gap between it and the bid is the spread." },
  { term: "ASM (Additional Surveillance Measure)", def: "An exchange framework that puts unusually volatile stocks under extra checks — like higher margins — to curb speculation. An ASM tag is a caution flag, not a verdict." },
  { term: "Bid price", def: "The highest price a buyer is currently willing to pay for a share. You sell at the bid." },
  { term: "Blue-chip", def: "A large, well-established, financially sound company with a long track record — think index heavyweights. Usually lower volatility, rarely explosive growth." },
  { term: "Bonus issue", def: "Free additional shares given to existing shareholders from a company's reserves (e.g. 1:1 doubles your shares). Your stake's value is unchanged — the price adjusts down proportionally." },
  { term: "Book value", def: "A company's net assets (assets minus liabilities) per share. Price-to-book compares the market price to it; useful mainly for banks and asset-heavy businesses." },
  { term: "Bull / Bear market", def: "A sustained rising market is a bull market; a sustained falling one (commonly a 20%+ drop) is a bear market. Describes trend and mood, not a precise threshold." },
  { term: "Circuit limit", def: "The maximum a stock or index can move up (upper circuit) or down (lower circuit) in a day before trading halts. Prevents runaway moves; limits vary by stock." },
  { term: "Delivery volume", def: "The portion of traded shares actually settled into demat accounts rather than squared off intraday. High delivery suggests conviction rather than day-trading churn." },
  { term: "Demat account", def: "An electronic account that holds your shares in dematerialised (paperless) form. Required to hold Indian equities; paired with a trading account to transact." },
  { term: "Dividend yield", def: "Annual dividend per share divided by the share price, as a percent. A 3% yield means ₹3 paid yearly per ₹100 invested — income, separate from price gains." },
  { term: "DII (Domestic Institutional Investor)", def: "Indian institutions — mutual funds, insurers, banks, pension funds — that invest in the markets. Their net buying/selling is tracked daily as a demand signal." },
  { term: "DRHP (Draft Red Herring Prospectus)", def: "The preliminary document a company files with SEBI before an IPO, detailing its business, financials, and risks. The single best primary source before applying to an IPO." },
  { term: "EPS (Earnings Per Share)", def: "Net profit divided by the number of shares. Rising EPS means growing per-share profitability; it's the 'E' in the P/E ratio." },
  { term: "F&O (Futures & Options)", def: "Derivative contracts whose value derives from an underlying stock or index. Used to hedge or speculate with leverage — high risk, and most retail F&O traders lose money." },
  { term: "FII / FPI (Foreign Institutional / Portfolio Investor)", def: "Overseas investors putting money into Indian markets. Large FII flows can swing indices sharply; their daily net figure is closely watched." },
  { term: "Free float", def: "The shares actually available for public trading, excluding promoter and locked-in holdings. Index weights use free-float market cap, not total market cap." },
  { term: "Fundamental analysis", def: "Valuing a company by studying its business, financials, management, and industry to judge whether the price is fair. The opposite lens to technical analysis." },
  { term: "GMP (Grey Market Premium)", def: "The unofficial, unregulated price at which an upcoming IPO's shares trade before listing. A rough sentiment gauge — often wrong, and no basis for a decision." },
  { term: "GSM (Graded Surveillance Measure)", def: "An escalating SEBI/exchange framework for stocks with weak fundamentals or abnormal price action, adding restrictions to protect investors. A strong caution flag." },
  { term: "Index fund", def: "A fund that mechanically mirrors an index like the Nifty 50, aiming to match its return at very low cost rather than beat it. A common core-holding for passive investors." },
  { term: "IPO (Initial Public Offering)", def: "The first sale of a private company's shares to the public, listing it on an exchange. Applications are made through ASBA at the fixed or book-built price band." },
  { term: "Large / Mid / Small cap", def: "SEBI's size buckets by market cap: the top 100 companies are large-cap, 101–250 mid-cap, and the rest small-cap. Smaller usually means higher growth potential and higher risk." },
  { term: "Lot size", def: "The fixed number of shares per contract in F&O (and the minimum application unit in IPOs). You trade derivatives in whole lots, not single shares." },
  { term: "Market capitalisation", def: "Share price times total shares outstanding — the market's price tag on the whole company. The primary way stocks are sized and sorted." },
  { term: "NAV (Net Asset Value)", def: "The per-unit value of a mutual fund, calculated daily from its holdings. You buy and redeem fund units at NAV; a higher NAV is not 'expensive'." },
  { term: "Nifty 50", def: "NSE's benchmark index of 50 large, liquid Indian companies across sectors, weighted by free-float market cap. The most-quoted gauge of the Indian market." },
  { term: "P/E (Price-to-Earnings)", def: "Share price divided by earnings per share — how many rupees you pay per rupee of annual profit. A high P/E prices in growth; compare only within a sector." },
  { term: "Penny stock", def: "A very low-priced small-cap share, often thinly traded and volatile. Low price ≠ cheap value; these are where most manipulation and losses concentrate." },
  { term: "Promoter holding", def: "The stake held by a company's founders/controlling group. Rising promoter holding (or pledging of shares) is a signal worth watching for alignment and risk." },
  { term: "Rally / Correction", def: "A rally is a sharp sustained rise; a correction is a ~10% pullback from a recent high. Corrections are routine and distinct from a full bear market." },
  { term: "RBI repo rate", def: "The rate at which the Reserve Bank of India lends to banks — its main policy lever. Cuts tend to support equities and rate-sensitive sectors; hikes do the reverse." },
  { term: "SEBI", def: "The Securities and Exchange Board of India, the market regulator. It oversees exchanges, IPOs, mutual funds, and advisers, and protects retail investors." },
  { term: "Sensex", def: "BSE's 30-stock benchmark index of large, established Indian companies. Along with the Nifty 50, the headline number for 'how the market did today'." },
  { term: "SIP (Systematic Investment Plan)", def: "Investing a fixed amount at regular intervals (usually monthly) into a mutual fund. Averages your buy price over time and builds discipline; the default for most retail investors." },
  { term: "Stop-loss", def: "A pre-set order to sell if a stock falls to a chosen price, capping a loss. A risk-management tool, not a profit strategy." },
  { term: "Stock split", def: "Dividing each share into several (e.g. 1:5), lowering the price and raising the share count while total value stays the same. Improves affordability and liquidity, not value." },
  { term: "Technical analysis", def: "Studying price charts, volume, and patterns to forecast short-term moves, rather than a company's fundamentals. Popular with traders; debated for long-term investing." },
  { term: "Upper / Lower circuit", def: "The price at which a stock hits its daily maximum up-move (upper) or down-move (lower) and trading pauses. Common in illiquid small-caps around big news." },
  { term: "Volume", def: "The number of shares traded in a period. Rising volume behind a price move suggests conviction; a move on thin volume is easier to reverse." },
];
