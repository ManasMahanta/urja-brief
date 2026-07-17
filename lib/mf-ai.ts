// AI dissection for a mutual fund.
//
// The model is fed REAL computed figures (returns, risk, drag, benchmark stats)
// and asked to interpret them — never to invent them. It is explicitly told it
// cannot see holdings, because we genuinely cannot source them free, and a model
// guessing at a portfolio is exactly the fabrication this project refuses.

import { unstable_cache } from "next/cache";
import { callGLMRetry, glmConfigured } from "@/lib/glm";
import type { FundData } from "@/lib/mf";

export type FundThesis = {
  summary: string;
  strategy: string;
  suits: string[];
  notFor: string[];
  bull: string[];
  bear: string[];
};

const SYS =
  "You are a neutral Indian mutual-fund educator. You are NOT a SEBI-registered adviser: never " +
  "recommend buying, selling, or switching a fund, never predict future returns, and never invent " +
  "portfolio holdings or figures you were not given. Interpret the supplied statistics qualitatively " +
  "and concretely. Reply with JSON only.";

/** Compact the computed stats into a prompt the model can reason over. */
export function factSheet(f: FundData): string {
  const r = (n: number | null) => (n === null ? "n/a" : `${n.toFixed(2)}%`);
  const lines: string[] = [
    `Fund: ${f.meta.name}`,
    `AMC: ${f.meta.house} | Category: ${f.meta.category} | Plan: ${f.meta.plan}`,
    `Returns (CAGR beyond 1Y) vs Nifty 50: ${f.returns
      .map((x) => `${x.label} ${r(x.fund)}${x.bench !== null ? ` (Nifty ${r(x.bench)})` : ""}`)
      .join(", ")}`,
  ];
  if (f.risk)
    lines.push(
      `Risk: volatility ${f.risk.vol.toFixed(1)}%, Sharpe ${f.risk.sharpe.toFixed(2)}, Sortino ${f.risk.sortino.toFixed(2)}, ` +
        `max drawdown ${f.risk.maxDD.toFixed(1)}% (${f.risk.maxDDFrom} to ${f.risk.maxDDTo}` +
        `${f.risk.recoveryDays ? `, recovered in ${f.risk.recoveryDays} days` : ", not yet recovered"}), ` +
        `best 1y ${r(f.risk.best1Y)}, worst 1y ${r(f.risk.worst1Y)}`,
    );
  if (f.rolling)
    lines.push(
      `Rolling ${f.rolling.years}y CAGR over ${f.rolling.count} windows: min ${f.rolling.min.toFixed(1)}%, ` +
        `median ${f.rolling.median.toFixed(1)}%, max ${f.rolling.max.toFixed(1)}%, positive ${f.rolling.positivePct.toFixed(0)}% of the time`,
    );
  if (f.bench)
    lines.push(
      `vs Nifty 50: beta ${f.bench.beta.toFixed(2)}, alpha ${f.bench.alpha.toFixed(2)}%, correlation ${f.bench.correlation.toFixed(2)}, ` +
        `upside capture ${f.bench.upCapture.toFixed(0)}%, downside capture ${f.bench.downCapture.toFixed(0)}%`,
    );
  if (f.drag?.lumpsum)
    lines.push(
      `Direct-vs-Regular expense drag: ${f.drag.rows.map((x) => `${x.years}y ${x.drag.toFixed(2)}%/yr`).join(", ")}`,
    );
  if (f.peers.length)
    lines.push(`Category peers (3y CAGR): ${f.peers.map((p) => `${p.house.replace(/ Mutual Fund$/, "")} ${r(p.r3)}`).join(", ")}`);
  lines.push("You do NOT have portfolio holdings, sector allocation, AUM, or the fund manager's name. Do not guess at them.");
  return lines.join("\n");
}

const str = (v: unknown, n = 400) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const arr = (v: unknown, n = 4) =>
  Array.isArray(v) ? v.map((x) => str(x, 220)).filter(Boolean).slice(0, n) : [];

const cachedThesis = unstable_cache(
  async (_code: number, facts: string): Promise<FundThesis> => {
    if (!glmConfigured()) throw new Error("no llm");
    const user =
      `${facts}\n\nInterpret this fund for an Indian investor. JSON only:\n` +
      `{"summary":"2-3 sentences on what this fund is and how it has actually behaved",` +
      `"strategy":"2-3 sentences inferring the strategy from the risk/return signature (e.g. low beta + high downside protection suggests a defensive, cash-heavy or quality-tilted approach)",` +
      `"suits":["who this profile fits, 3 items"],"notFor":["who it does not fit, 2 items"],` +
      `"bull":["what the numbers support, 3 items"],"bear":["what the numbers warn about, 3 items"]}`;

    const reply = await callGLMRetry(SYS, user, 1600);
    if (!reply) throw new Error("ai unavailable");
    const json = reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1);
    const o = JSON.parse(json) as Record<string, unknown>;
    const t: FundThesis = {
      summary: str(o.summary, 700),
      strategy: str(o.strategy, 700),
      suits: arr(o.suits, 3),
      notFor: arr(o.notFor, 2),
      bull: arr(o.bull, 3),
      bear: arr(o.bear, 3),
    };
    if (!t.summary) throw new Error("empty thesis");
    return t;
  },
  ["mf-thesis"],
  { revalidate: 43_200, tags: ["mf"] },
);

/** AI read of a fund. Null when unavailable — the page degrades to pure data. */
export async function getFundThesis(f: FundData): Promise<FundThesis | null> {
  return cachedThesis(f.meta.code, factSheet(f)).catch(() => null);
}

/* --- comparison --------------------------------------------------------- */

export type Comparison = { verdict: string; differences: string[]; tradeoffs: string[] };

const cachedComparison = unstable_cache(
  async (_key: string, facts: string): Promise<Comparison> => {
    if (!glmConfigured()) throw new Error("no llm");
    const user =
      `${facts}\n\nCompare these funds for an Indian investor. Explain how they genuinely differ ` +
      `in behaviour — not which is "best". JSON only:\n` +
      `{"verdict":"3-4 sentences on how these funds actually differ in character and what drives the gap",` +
      `"differences":["concrete, figure-anchored contrasts, 3-4 items"],` +
      `"tradeoffs":["what each one asks you to accept in exchange, 3 items"]}`;

    const reply = await callGLMRetry(SYS, user, 1600);
    if (!reply) throw new Error("ai unavailable");
    const json = reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1);
    const o = JSON.parse(json) as Record<string, unknown>;
    const c: Comparison = {
      verdict: str(o.verdict, 900),
      differences: arr(o.differences, 4),
      tradeoffs: arr(o.tradeoffs, 3),
    };
    if (!c.verdict) throw new Error("empty comparison");
    return c;
  },
  ["mf-comparison"],
  { revalidate: 43_200, tags: ["mf"] },
);

/** AI read of how a set of funds differ. Null when unavailable. */
export async function getComparison(funds: FundData[]): Promise<Comparison | null> {
  if (funds.length < 2) return null;
  const key = funds.map((f) => f.meta.code).sort((a, b) => a - b).join("-");
  const facts = funds.map((f) => factSheet(f)).join("\n\n---\n\n");
  return cachedComparison(key, facts).catch(() => null);
}
