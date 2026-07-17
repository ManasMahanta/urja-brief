import { NextResponse } from "next/server";
import { glmConfigured } from "@/lib/glm";
import { getSimpleExplanation, isExplainSection } from "@/lib/explain";

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

  let body: { section?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const section = typeof body.section === "string" ? body.section : "";
  if (!isExplainSection(section)) {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }

  const explanation = await getSimpleExplanation(section);
  if (!explanation) {
    return NextResponse.json(
      { error: "The explainer is unavailable right now — the section's data source may be down." },
      { status: 502 },
    );
  }
  return NextResponse.json({ explanation });
}
