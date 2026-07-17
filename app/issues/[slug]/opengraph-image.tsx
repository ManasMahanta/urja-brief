import { ImageResponse } from "next/og";
import { getIssue, formatDate } from "@/lib/issues";
import { site } from "@/lib/site";

export const alt = "Issue card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Per-issue share card: issue title over the brand stage.
export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const issue = getIssue(slug);
  const title = issue?.title ?? site.name;
  const date = issue ? formatDate(issue.date) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #08080d 0%, #101024 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
          <span>Signal</span>
          <span style={{ color: "#6b7280", marginLeft: 10 }}>&amp; Noise</span>
        </div>
        <div
          style={{
            fontSize: title.length > 60 ? 54 : 66,
            fontWeight: 700,
            letterSpacing: "-1.5px",
            lineHeight: 1.15,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 26, color: "#a5b4fc" }}>{date}</span>
          <span style={{ fontSize: 26, color: "#71717a" }}>{site.url.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>
    ),
    size,
  );
}
