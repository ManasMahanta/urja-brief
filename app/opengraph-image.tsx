import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Site-wide social share card: dark stage, load-curve waveform, name + tagline.
// Satori note: SVG <text> is rejected (500s the card) — draw text with divs only.
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
          background: "linear-gradient(135deg, #05070d 0%, #0a1626 100%)",
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
            d="M0 44 Q40 42 70 36 Q110 28 140 14 Q160 6 180 10 Q205 16 225 30 Q250 46 285 50 Q330 54 365 42 Q395 32 420 18 Q450 2 480 10 Q505 17 520 26"
            stroke="#22d3ee"
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
          <span>Urja</span>
          <span style={{ color: "#67e8f9", marginLeft: 20 }}>Brief</span>
        </div>
        <div style={{ fontSize: 34, color: "#a5f3fc", marginTop: 24 }}>
          {site.tagline}
        </div>
        <div style={{ fontSize: 24, color: "#94a3b8", marginTop: 40 }}>
          Live grid pulse · Generation mix · State-wise demand · Weekly brief
        </div>
      </div>
    ),
    size,
  );
}
