import { getCarbonNow, TONE_COLOR, type CleanTone } from "@/lib/carbon";
import { site } from "@/lib/site";

// A self-contained, framable widget of the live India grid — demand, renewable
// share, and carbon intensity — for anyone to drop on their own page. Returns a
// full HTML document (no site chrome), so it deliberately bypasses the app
// layout. Distribution feature: every embed links back here.

export const dynamic = "force-dynamic";

const HEX: Record<CleanTone, string> = { clean: "#34d399", average: "#fbbf24", dirty: "#fb7185" };

const istTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export async function GET() {
  const carbon = await getCarbonNow();
  const home = site.url;

  const body = carbon
    ? (() => {
        const tone = carbon.verdict ? carbon.verdict.tone : "average";
        const accent = HEX[tone];
        return `
        <div class="row">
          <div class="stat">
            <span class="label">Demand met</span>
            <span class="value">${Math.round(carbon.snapshot.demandMetMw).toLocaleString("en-IN")}<i>MW</i></span>
          </div>
          <div class="stat">
            <span class="label">Renewables</span>
            <span class="value" style="color:#34d399">${carbon.snapshot.renewableSharePct.toFixed(1)}<i>%</i></span>
          </div>
          <div class="stat">
            <span class="label">Carbon intensity</span>
            <span class="value" style="color:${accent}">${Math.round(carbon.intensityGco2)}<i>g/kWh</i></span>
          </div>
        </div>
        ${carbon.verdict ? `<div class="verdict" style="color:${accent}"><span class="dot" style="background:${accent}"></span>${carbon.verdict.headline}</div>` : ""}
        <div class="foot"><span>MERIT · ${istTime(carbon.snapshot.fetchedAt)} IST</span><span>live</span></div>`;
      })()
    : `<div class="unavail">Live grid data is unavailable right now.</div>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Urja Brief — live India grid</title><style>
*{margin:0;box-sizing:border-box}
body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#05070d;color:#e2e8f0;padding:16px}
a.card{display:block;text-decoration:none;color:inherit;border:1px solid rgba(56,189,248,.18);border-radius:14px;padding:16px;background:linear-gradient(180deg,rgba(8,12,22,.9),rgba(5,7,13,.95))}
.head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.brand{font-weight:700;letter-spacing:-.02em;color:#fff}
.brand b{color:#22d3ee}
.tag{font:600 10px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.14em;color:#67e8f9}
.row{display:flex;gap:18px;flex-wrap:wrap}
.stat{display:flex;flex-direction:column;gap:2px}
.label{font-size:11px;color:#94a3b8}
.value{font:700 26px ui-monospace,monospace;color:#fff;line-height:1}
.value i{font-size:12px;font-weight:400;color:#94a3b8;margin-left:4px;font-style:normal}
.verdict{margin-top:12px;font-weight:600;font-size:13px;display:flex;align-items:center;gap:7px}
.dot{width:9px;height:9px;border-radius:50%}
.foot{display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid rgba(148,163,184,.12);font:500 10px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em;color:#64748b}
.unavail{font-size:13px;color:#94a3b8}
</style></head><body>
<a class="card" href="${home}/carbon" target="_blank" rel="noopener">
  <div class="head"><span class="brand">Urja <b>Brief</b></span><span class="tag">India grid · live</span></div>
  ${body}
</a>
</body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Cache at the edge for 5 minutes; embedders get a fresh-enough number
      // without hammering MERIT. Framable from anywhere by design.
      "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
      "x-frame-options": "ALLOWALL",
      "content-security-policy": "frame-ancestors *",
    },
  });
}
