import { NextResponse } from "next/server";
import { glmConfigured } from "@/lib/glm";
import { getSimpleExplanation, isExplainSection, type ExplainLang } from "@/lib/explain";
import { allowRequest, clientIp } from "@/lib/rate-limit";

// "Explain simply" endpoint. The client sends a section key only — context is
// rebuilt server-side (see lib/explain.ts), and results are cached per
// section, so this stays cheap and injection-free.
export async function POST(request: Request) {
  if (!glmConfigured()) {
    return NextResponse.json(
      { error: "Simple explanations are not configured on this deployment." },
      { status: 503 },
    );
  }

  // Results are cached per section+language, but cold-cache calls reach GLM —
  // keep a generous per-IP budget anyway.
  if (!allowRequest(`explain:${clientIp(request)}`, 20)) {
    return NextResponse.json({ error: "Too many requests in a minute — please pause briefly." }, { status: 429 });
  }

  let body: { section?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const section = typeof body.section === "string" ? body.section : "";
  if (!isExplainSection(section)) {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }
  const lang: ExplainLang = body.lang === "hi" ? "hi" : "en";

  const explanation = await getSimpleExplanation(section, lang);
  if (!explanation) {
    return NextResponse.json(
      { error: "The explainer is unavailable right now — the section's data source may be down." },
      { status: 502 },
    );
  }
  return NextResponse.json({ explanation });
}
