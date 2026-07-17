import { NextResponse } from "next/server";
import { callGLM, glmConfigured } from "@/lib/glm";

const MAX_MESSAGES = 8;

type AnalystRequest = {
  messages?: { role?: "analyst" | "user"; text?: string }[];
  question?: string;
  level?: string;
};

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

// "Ask the Analyst": an educational Q&A helper for the Academy. Explains market
// concepts, terms, sectors, and how to research — but never gives buy/sell calls.
export async function POST(request: Request) {
  if (!glmConfigured()) {
    return NextResponse.json(
      { error: "Ask the Analyst is not configured yet. Add ZAI_API_KEY to enable it." },
      { status: 503 },
    );
  }

  let body: AnalystRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const question = clean(body.question, 2000);
  const level = clean(body.level, 20) || "Beginner";
  if (!question) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }

  const history = Array.isArray(body.messages)
    ? body.messages
        .slice(-MAX_MESSAGES)
        .map((m) => `${m.role === "user" ? "Learner" : "Analyst"}: ${clean(m.text, 2000)}`)
        .join("\n\n")
    : "";

  const system =
    "You are a patient, neutral market educator for Indian retail investors, " +
    "answering at a " + level + " level. Explain concepts, terms, sectors, ratios, " +
    "and how to research a stock, in clear plain English with concrete Indian-market " +
    "examples where helpful.\n\n" +
    "Hard rules: you are NOT a SEBI-registered adviser. NEVER recommend buying, " +
    "selling, or holding any specific stock, never give price targets, and never " +
    "predict where a stock or index will go. If asked for a tip or a call, decline " +
    "and instead teach the reader how to research it themselves. Don't invent " +
    "numbers. Keep answers focused (a few short paragraphs).";

  const user = history
    ? `Conversation so far:\n${history}\n\nNew question:\n${question}`
    : question;

  try {
    const reply = await callGLM(system, user, 1000);
    if (!reply) {
      return NextResponse.json(
        { error: "The analyst is unavailable right now. Please try again shortly." },
        { status: 502 },
      );
    }
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("analyst request failed", error);
    return NextResponse.json(
      { error: "The analyst is unavailable right now. Please try again shortly." },
      { status: 502 },
    );
  }
}
