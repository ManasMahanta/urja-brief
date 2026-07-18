import { ImageResponse } from "next/og";

// Shared social-share card for the desks: dark branded stage with one big live
// number. Satori note (see opengraph-image.tsx): SVG <text> 500s the card — all
// text is divs. Keep every desk card visually consistent; only the stat changes.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export function deskCard(opts: {
  kicker: string;
  value: string;
  unit?: string;
  sub: string;
  accent?: string;
}) {
  const accent = opts.accent ?? "#67e8f9";
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
          background: "linear-gradient(135deg, #05070d 0%, #0a1626 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700, letterSpacing: "-1px" }}>
          <span>Urja</span>
          <span style={{ color: "#67e8f9", marginLeft: 12 }}>Brief</span>
          <span style={{ fontSize: 22, fontWeight: 400, color: "#64748b", marginLeft: 24 }}>India&apos;s energy, decoded</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, textTransform: "uppercase", letterSpacing: "3px", color: "#67e8f9" }}>{opts.kicker}</div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 12 }}>
            <span style={{ fontSize: 150, fontWeight: 700, lineHeight: 1, letterSpacing: "-4px", color: accent }}>{opts.value}</span>
            {opts.unit ? <span style={{ fontSize: 44, color: "#94a3b8", marginLeft: 18, marginBottom: 18 }}>{opts.unit}</span> : null}
          </div>
          <div style={{ fontSize: 32, color: "#cbd5e1", marginTop: 20, maxWidth: 980 }}>{opts.sub}</div>
        </div>

        <div style={{ fontSize: 22, color: "#64748b" }}>urja-brief.vercel.app · live from the Ministry of Power&apos;s MERIT dashboard</div>
      </div>
    ),
    OG_SIZE,
  );
}
