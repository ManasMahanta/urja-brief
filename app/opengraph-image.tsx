import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Site-wide social share card: dark stage, brand waveform, name + tagline.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #08080d 0%, #101024 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <svg
          width="1040"
          height="120"
          viewBox="0 0 520 60"
          style={{ position: "absolute", top: 120, left: 80, opacity: 0.9 }}
        >
          <path
            d="M0 30 L14 18 L28 44 L42 8 L56 52 L70 16 L84 40 L98 24 L112 30 Q140 -14 168 30 T224 30 Q252 -14 280 30 T336 30 Q364 -14 392 30 T448 30 L520 30"
            stroke="#818cf8"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-2px",
            marginTop: 120,
          }}
        >
          <span>Signal</span>
          <span style={{ color: "#6b7280", marginLeft: 20 }}>&amp; Noise</span>
        </div>
        <div style={{ fontSize: 34, color: "#a5b4fc", marginTop: 24 }}>
          {site.tagline}
        </div>
        <div style={{ fontSize: 24, color: "#71717a", marginTop: 40 }}>
          Live market pulse · Indian stocks · Investor education · Weekly brief
        </div>
      </div>
    ),
    size,
  );
}
