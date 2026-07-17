import { NextResponse } from "next/server";
import { callGLM, glmConfigured } from "@/lib/glm";
import { getFund } from "@/lib/mf";
import { factSheet } from "@/lib/mf-ai";

// Interactive AI for the dissection pages:
//  • task "copilot" — educational Q&A scoped to one company or fund.
//  • task "persona" — re-explain the company for a given audience.
// Both are educational; neither issues buy/sell calls.
//
// For funds the fact sheet is fetched server-side from the scheme code rather
// than accepted from the client, so a caller can't inject invented "figures"
// into the model's context.

type Body = {
  task?: "copilot" | "persona";
  kind?: "stock" | "fund";
  code?: number;
  symbol?: string;
  name?: string;
  question?: string;
  persona?: string;
  messages?: { role?: "user" | "ai"; text?: string }[];
};

const PERSONAS: Record<string, string> = {
  Beginner: "a complete beginner — use plain language, define every term, short paragraphs",
  "Retail investor": "a retail investor — practical, jargon-light, focus on what actually matters",
  "Financial advisor": "a financial advisor — balanced, suitability and risk framing",
  "Portfolio manager": "a portfolio manager — positioning, factor exposure, catalysts, sizing",
  "Hedge fund analyst": "a hedge-fund analyst — sharp, thesis/anti-thesis, variant perception, second-order effects",
  CFO: "a corporate CFO — capital allocation, balance-sheet and margin lens",
};

function clean(v: unknown, n: number) {
  return typeof v === "string" ? v.trim().slice(0, n) : "";
}

export async function POST(request: Request) {
  if (!glmConfigured()) {
    return NextResponse.json({ error: "AI is not configured (set ZAI_API_KEY)." }, { status: 503 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const isFund = body.kind === "fund";
  const name = clean(body.name, 120) || clean(body.symbol, 40) || (isFund ? "this fund" : "this company");

  let base =
    `You are a neutral equity-market educator analysing ${name}. You are NOT a SEBI-registered adviser: ` +
    `never give buy/sell/hold calls or price targets, and never invent precise financials — reason qualitatively. ` +
    `Explain clearly with concrete, non-generic points.`;

  if (isFund) {
    base =
      `You are a neutral Indian mutual-fund educator analysing ${name}. You are NOT a SEBI-registered adviser: ` +
      `never recommend buying, selling, or switching a fund, and never predict returns. Explain clearly and concretely.`;
    // Ground the model in the same real figures the page renders.
    const code = Number(body.code);
    if (Number.isFinite(code)) {
      const f = await getFund(code);
      if (f) {
        base +=
          `\n\nVerified figures for this fund (use these; do not invent others):\n${factSheet(f)}`;
      }
    }
  }

  if (body.task === "persona") {
    const persona = clean(body.persona, 40) || "Retail investor";
    const audience = PERSONAS[persona] ?? PERSONAS["Retail investor"];
    const system = `${base} Explain ${name} for ${audience}. Keep it to 2 short paragraphs.`;
    const reply = await callGLM(system, `Explain ${name} as an investment for this audience.`, 700);
    if (!reply) return NextResponse.json({ error: "AI unavailable." }, { status: 502 });
    return NextResponse.json({ reply });
  }

  // default: copilot Q&A
  const question = clean(body.question, 2000);
  if (!question) return NextResponse.json({ error: "A question is required." }, { status: 400 });
  const history = Array.isArray(body.messages)
    ? body.messages
        .slice(-8)
        .map((m) => `${m.role === "user" ? "User" : "Analyst"}: ${clean(m.text, 1500)}`)
        .join("\n\n")
    : "";
  const system = `${base} Answer the user's question in a few tight paragraphs. If asked for a tip or call, decline and teach them how to research it instead.`;
  const user = history ? `Conversation so far:\n${history}\n\nNew question:\n${question}` : question;

  try {
    const reply = await callGLM(system, user, 1000);
    if (!reply) return NextResponse.json({ error: "AI unavailable right now." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "AI unavailable right now." }, { status: 502 });
  }
}
