import { NextResponse } from "next/server";
import { callGLM, glmConfigured } from "@/lib/glm";
import { powerContext } from "@/lib/power-ai";
import { allowRequest, clientIp } from "@/lib/rate-limit";

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  if (!glmConfigured()) return NextResponse.json({ error: "The analyst is not configured. Add an AI provider key to enable it." }, { status: 503 });
  // Every analyst call reaches GLM (unlike the cached explainer), so it gets
  // the tighter budget.
  if (!allowRequest(`analyst:${clientIp(request)}`, 6)) {
    return NextResponse.json({ error: "Too many questions in a minute — please pause briefly." }, { status: 429 });
  }
  let body: { question?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const question = clean(body.question, 800);
  if (!question) return NextResponse.json({ error: "Ask a question about the supplied desk context." }, { status: 400 });

  const context = await powerContext();
  const reply = await callGLM(
    "You are the Urja Brief analyst. Answer only from the supplied desk context. Clearly distinguish listed-company market context, news headlines, and official source links. Never claim an underlying source says more than the provided context. Do not forecast power demand, generation, pricing, or policy; do not give grid-operation, safety, procurement, or investment advice. When the context cannot answer, say so and point to the relevant official reporting source. Respond in at most 140 words, in plain English.",
    `${context}\n\nReader question: ${question}`,
    450,
  );
  if (!reply) return NextResponse.json({ error: "The analyst is unavailable right now. Please try again shortly." }, { status: 502 });
  return NextResponse.json({ reply });
}
