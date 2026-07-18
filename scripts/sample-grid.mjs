// Samples the MERIT all-India power position (plus the major states) and
// maintains three artefacts under data/ (repo-as-database, committed by
// .github/workflows/sample-grid.yml every 15 minutes):
//
//   data/samples/<IST date>.json   — the day's raw 15-minute series
//   data/rollups/<IST month>.json  — one summary row per day (observed peak,
//                                    min, max RE share, sample count)
//   data/records.json              — all-time OBSERVED records (peak demand,
//                                    RE share, storage despatch) — "observed"
//                                    because 15-minute sampling can miss the
//                                    true extremes between ticks
//
// Self-contained on purpose: plain Node, no dependencies, own copy of the
// MERIT parser. If MERIT is down or the parse fails it exits 0 without
// writing — a gap in the series is honest; a fabricated point is not.

import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";

const ROOT = path.join(import.meta.dirname, "..");
const MERIT = "https://meritindia.in";
const UA = "Mozilla/5.0 UrjaBrief/1.0 (sampler)";

// meritindia.in omits its TLS intermediate; append it (see lib/grid-live.ts).
const pem = fs.readFileSync(path.join(ROOT, "certs/emsign-ssl-ca-g1.pem"), "utf8");
if (typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), pem]);
}

const FUELS = ["thermal", "gas", "nuclear", "hydro", "renewable", "storage", "other"];

// Fixed major-state list (stable across runs so each state's series is
// continuous). Codes are MERIT's own.
const STATES = ["MHA", "UP", "GJT", "TND", "KRT", "RJ", "TLG", "MPD", "DL", "PNB", "BGL", "BHR"];

// meritindia.in is an Indian government site that isn't reachable from GitHub's
// US-based runners ("fetch failed"), so we sample via our own /api/grid, which
// reaches MERIT from Vercel's Mumbai region and returns the same snapshot as
// clean JSON. Override with SAMPLE_SOURCE_URL if the deployment moves.
const GRID_API = process.env.SAMPLE_SOURCE_URL || "https://urja-brief.vercel.app/api/grid";

async function fetchSnapshot() {
  const response = await fetch(GRID_API, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`grid API HTTP ${response.status}`);
  const data = await response.json();
  if (typeof data.demandMetMw !== "number" || !data.mixMw) {
    throw new Error("grid API missing fields (MERIT may be down)");
  }
  const mix = Object.fromEntries(FUELS.map((fuel) => [fuel, data.mixMw[fuel] ?? 0]));
  const total = Object.values(mix).reduce((sum, mw) => sum + mw, 0);
  if (total <= 0) throw new Error("grid API produced zero generation");

  return {
    t: new Date().toISOString(),
    demandMw: data.demandMetMw,
    mix,
    rePct: Number(((mix.renewable / total) * 100).toFixed(2)),
  };
}

// Per-state current status: [demandMet, ownGeneration, import] MW, null when
// MERIT reports "-". A failed state is simply omitted from this tick.
async function fetchState(code) {
  try {
    const response = await fetch(`${MERIT}/StateWiseDetails/BindCurrentStateStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "User-Agent": UA },
      body: `{StateCode:${JSON.stringify(code)}}`,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const row = (await response.json())?.[0];
    if (!row) return null;
    const num = (v) => (v && v !== "-" && v.trim() !== "" ? Number(v.replace(/,/g, "")) : null);
    const demand = num(row.Demand);
    if (demand === null) return null;
    return [demand, num(row.ISGS), num(row.ImportData)];
  } catch {
    return null;
  }
}

// IST calendar date, since the load curve is an IST-day artefact.
const istDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);

const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
};

// Fold the whole day's series each run (idempotent), so a record set earlier
// in the day is never missed; records from previous days persist in the file.
function updateRecords(daySamples) {
  const file = path.join(ROOT, "data/records.json");
  const records = readJson(file, {});
  const beat = (key, value, t) => {
    if (value === undefined || value === null) return;
    if (!records[key] || value > records[key].value) {
      records[key] = { value, t };
    }
  };
  for (const sample of daySamples) {
    beat("peakDemandMw", sample.demandMw, sample.t);
    beat("maxRePct", sample.rePct, sample.t);
    beat("maxRenewableMw", sample.mix.renewable, sample.t);
    beat("maxStorageMw", sample.mix.storage, sample.t);
  }
  records.since ??= istDate();
  writeJson(file, records);
}

function updateRollup(daySamples, day) {
  const month = day.slice(0, 7);
  const file = path.join(ROOT, "data/rollups", `${month}.json`);
  const rollup = readJson(file, {});
  const demands = daySamples.map((s) => s.demandMw);
  const peakIdx = demands.indexOf(Math.max(...demands));
  rollup[day] = {
    peakMw: demands[peakIdx],
    peakT: daySamples[peakIdx].t,
    minMw: Math.min(...demands),
    maxRePct: Math.max(...daySamples.map((s) => s.rePct)),
    samples: daySamples.length,
  };
  writeJson(file, rollup);
}

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ISO week key (YYYY-Www) — one auto-forecast per calendar week.
const isoWeek = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dow + 3); // nearest Thursday
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThu) / 86_400_000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

// Daily peaks over the last 14 days, from the rollup files.
const recentPeaks = (day) => {
  const months = [...new Set([day.slice(0, 7), addDays(day, -31).slice(0, 7)])];
  const peaks = [];
  for (const month of months) {
    const rollup = readJson(path.join(ROOT, "data/rollups", `${month}.json`), {});
    for (const [date, roll] of Object.entries(rollup)) {
      if (date >= addDays(day, -14) && date <= day && roll.peakMw) peaks.push(roll.peakMw);
    }
  }
  return peaks;
};

// Once a week, publish a dated, falsifiable peak-demand call into
// data/forecasts.json. The scoreboard grades it automatically against the
// observed rollups — the site predicting, then holding itself to account, with
// no human in the loop. Guarded so it can never disturb the sampling above.
function maybeGenerateForecast(day) {
  const file = path.join(ROOT, "data/forecasts.json");
  const forecasts = readJson(file, []);
  const id = `auto-peak-${isoWeek(day)}`;
  if (forecasts.some((f) => f.id === id)) return; // one per week
  const peaks = recentPeaks(day);
  if (peaks.length < 3) return; // not enough history to project honestly
  const recentMax = Math.max(...peaks);
  const target = Math.round(recentMax / 1000) * 1000; // nearest GW
  const resolvesOn = addDays(day, 7);
  forecasts.push({
    id,
    auto: true,
    madeOn: day,
    horizon: `By ${resolvesOn}`,
    claim: `All-India demand met tops ${Math.round(target / 1000)} GW at least once in the next 7 days.`,
    basis: `Auto-generated from our sampling: daily peaks have reached about ${Math.round(recentMax / 1000)} GW over the last two weeks, so a similar high in the week ahead is the call.`,
    resolvesOn,
    metric: "peakDemandMw",
    direction: "above",
    target,
  });
  writeJson(file, forecasts);
  console.log(`forecast added: ${id} (peak > ${target} MW by ${resolvesOn})`);
}

try {
  const sample = await fetchSnapshot();

  const day = istDate();
  const file = path.join(ROOT, "data/samples", `${day}.json`);
  const existing = readJson(file, []);
  // Idempotency: don't append if the last sample is under 5 minutes old
  // (re-runs, retries) — but still refold records/rollups, which are
  // idempotent, so they can never go stale relative to the series.
  const last = existing[existing.length - 1];
  const fresh = !last || Date.parse(sample.t) - Date.parse(last.t) >= 5 * 60 * 1000;
  if (fresh) {
    existing.push(sample);
    writeJson(file, existing);
  }
  if (existing.length) {
    updateRecords(existing);
    updateRollup(existing, day);
  }
  console.log(
    fresh
      ? `sampled ${sample.demandMw} MW, RE ${sample.rePct}% → ${path.basename(file)} (${existing.length} points)`
      : "no append (last sample under 5 minutes old); records/rollups refolded",
  );
} catch (error) {
  // Exit clean: a missed sample is an honest gap, and the workflow should not
  // go red every time a government dashboard hiccups.
  console.log(`no sample written: ${error.message}`);
}

// Independent of this tick's sampling — the weekly call reads existing rollups.
try {
  maybeGenerateForecast(istDate());
} catch (error) {
  console.log(`forecast skipped: ${error.message}`);
}
