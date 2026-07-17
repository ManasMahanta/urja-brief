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

async function fetchSnapshot() {
  const response = await fetch(MERIT, {
    headers: { "User-Agent": UA },
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

try {
  const sample = await fetchSnapshot();

  // Major states, in small batches; failures just drop out of this tick.
  const states = {};
  for (let i = 0; i < STATES.length; i += 6) {
    const batch = STATES.slice(i, i + 6);
    const rows = await Promise.all(batch.map((code) => fetchState(code)));
    batch.forEach((code, j) => {
      if (rows[j]) states[code] = rows[j];
    });
  }
  if (Object.keys(states).length) sample.states = states;

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
      ? `sampled ${sample.demandMw} MW, RE ${sample.rePct}%, ${Object.keys(states).length} states → ${path.basename(file)} (${existing.length} points)`
      : "no append (last sample under 5 minutes old); records/rollups refolded",
  );
} catch (error) {
  // Exit clean: a missed sample is an honest gap, and the workflow should not
  // go red every time a government dashboard hiccups.
  console.log(`no sample written: ${error.message}`);
}
