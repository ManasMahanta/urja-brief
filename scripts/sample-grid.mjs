// Samples the MERIT all-India power position and appends it to
// data/samples/<IST date>.json — the raw material for the load-curve and
// renewable-share history. Run by .github/workflows/sample-grid.yml every
// 15 minutes; the workflow commits the file back to the repo
// (repo-as-database, no server or storage service involved).
//
// Self-contained on purpose: plain Node, no dependencies, own copy of the
// MERIT parser. If MERIT is down or the parse fails it exits 0 without
// writing — a gap in the series is honest; a fabricated point is not.

import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";

const ROOT = path.join(import.meta.dirname, "..");

// meritindia.in omits its TLS intermediate; append it (see lib/grid-live.ts).
const pem = fs.readFileSync(path.join(ROOT, "certs/emsign-ssl-ca-g1.pem"), "utf8");
if (typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), pem]);
}

const FUELS = ["thermal", "gas", "nuclear", "hydro", "renewable", "storage", "other"];

async function fetchSnapshot() {
  const response = await fetch("https://meritindia.in", {
    headers: { "User-Agent": "Mozilla/5.0 UrjaBrief/1.0 (sampler)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`MERIT HTTP ${response.status}`);
  const html = (await response.text()).replace(/\s+/g, " ");

  const fields = {};
  for (const match of html.matchAll(/<span class="counter">\s*([\d,]+)\s*<\/span>/g)) {
    const context = html
      .slice(Math.max(0, match.index - 400), match.index)
      .replace(/<[^>]*>/g, " ");
    const label = context.match(/\b(DEMAND|THERMAL|GAS|NUCLEAR|HYDRO|RENEWABLE|STORAGE|OTHER)\b/g);
    if (!label) continue;
    const key = label[label.length - 1].toLowerCase();
    if (!(key in fields)) fields[key] = Number(match[1].replace(/,/g, ""));
  }
  if (typeof fields.demand !== "number" || typeof fields.thermal !== "number") {
    throw new Error("MERIT parse failed — page layout may have changed");
  }

  const mix = Object.fromEntries(FUELS.map((fuel) => [fuel, fields[fuel] ?? 0]));
  const total = Object.values(mix).reduce((sum, mw) => sum + mw, 0);
  if (total <= 0) throw new Error("MERIT parse produced zero generation");

  return {
    t: new Date().toISOString(),
    demandMw: fields.demand,
    mix,
    rePct: Number(((mix.renewable / total) * 100).toFixed(2)),
  };
}

// IST calendar date, since the load curve is an IST-day artefact.
const istDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);

try {
  const sample = await fetchSnapshot();
  const file = path.join(ROOT, "data/samples", `${istDate()}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  // Idempotency: skip if the last sample is under 5 minutes old (re-runs, retries).
  const last = existing[existing.length - 1];
  if (last && Date.parse(sample.t) - Date.parse(last.t) < 5 * 60 * 1000) {
    console.log("skip: last sample is under 5 minutes old");
    process.exit(0);
  }
  existing.push(sample);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(existing, null, 1) + "\n");
  console.log(`sampled ${sample.demandMw} MW, RE ${sample.rePct}% → ${path.basename(file)} (${existing.length} points)`);
} catch (error) {
  // Exit clean: a missed sample is an honest gap, and the workflow should not
  // go red every time a government dashboard hiccups.
  console.log(`no sample written: ${error.message}`);
}
