import { NextResponse } from "next/server";
import { glmConfigured } from "@/lib/glm";
import { generateIssueMdx } from "@/lib/draft";

export const maxDuration = 300;

// On-demand weekly issue drafter: gathers the week's radar data, has GLM
// write a full issue in this site's MDX format, and returns it as a
// downloadable .mdx file. Save into content/issues/, edit, and push.
// Trigger: GET /api/draft-issue?secret=<CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = new URL(request.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!glmConfigured()) {
    return NextResponse.json(
      { error: "ZAI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  try {
    const mdx = await generateIssueMdx();
    if (!mdx) {
      return NextResponse.json({ error: "Draft generation failed." }, { status: 502 });
    }
    return new Response(mdx, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="draft-issue-${today}.mdx"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Draft generation failed." }, { status: 502 });
  }
}
