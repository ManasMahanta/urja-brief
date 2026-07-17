// Live grid data from MERIT (Merit Order Despatch of Electricity), the
// Ministry of Power / POSOCO dashboard at meritindia.in. Two surfaces:
//
//   • The homepage carries the current ALL INDIA POWER POSITION as
//     server-rendered HTML — demand met plus a per-fuel generation split.
//   • /StateWiseDetails exposes JSON endpoints for a state list and a
//     per-state current status (demand met / own generation / import),
//     which MERIT's own UI polls.
//
// MERIT publishes instantaneous MW without a reporting timestamp, so every
// snapshot here carries the time WE fetched it, and the UI must present the
// figures as "as fetched from MERIT", never as an official timestamped
// record. Every fetcher returns null/empty on failure — a flaky upstream
// must never break a page.

const MERIT = "https://meritindia.in";
const ua = "Mozilla/5.0 UrjaBrief/1.0";

// meritindia.in sends only its leaf certificate, so Node's fetch fails with
// UNABLE_TO_VERIFY_LEAF_SIGNATURE (curl and browsers fetch the missing
// intermediate themselves; undici does not). Appending the public emSign
// intermediate to the default trust store completes the chain. Guarded:
// tls.setDefaultCACertificates needs Node ≥ 22.15 — on older runtimes the
// fetchers below simply keep returning null, which the UI reports honestly.
import tls from "node:tls";
import { EMSIGN_SSL_CA_G1 } from "@/lib/emsign-ca";

// Structural type: these APIs exist from Node 22.15, but @types/node@20
// doesn't know them yet.
const tlsCa = tls as typeof tls & {
  getCACertificates?: (type: "default") => string[];
  setDefaultCACertificates?: (certs: string[]) => void;
};

if (tlsCa.setDefaultCACertificates && tlsCa.getCACertificates) {
  const defaults = tlsCa.getCACertificates("default");
  if (!defaults.includes(EMSIGN_SSL_CA_G1)) {
    tlsCa.setDefaultCACertificates([...defaults, EMSIGN_SSL_CA_G1]);
  }
}

export type FuelMix = {
  thermal: number;
  gas: number;
  nuclear: number;
  hydro: number;
  renewable: number;
  storage: number;
  other: number;
};

export type GridSnapshot = {
  demandMetMw: number;
  totalGenerationMw: number;
  mix: FuelMix;
  renewableSharePct: number; // renewable ÷ total generation
  fetchedAt: string; // ISO — when WE fetched it (MERIT publishes no timestamp)
};

export type StatePower = {
  code: string;
  name: string;
  demandMetMw: number;
  ownGenerationMw: number | null;
  importMw: number | null;
};

const num = (value: string): number => Number(value.replace(/,/g, ""));

// The MERIT homepage renders each figure as a labelled block ending in
// <span class="counter">N</span>. We walk the counters and read the fuel
// label from the preceding markup.
export async function getGridSnapshot(): Promise<GridSnapshot | null> {
  try {
    const response = await fetch(MERIT, {
      next: { revalidate: 300 },
      headers: { "User-Agent": ua },
    });
    if (!response.ok) return null;
    const html = (await response.text()).replace(/\s+/g, " ");

    const fields: Record<string, number> = {};
    for (const match of html.matchAll(/<span class="counter">\s*([\d,]+)\s*<\/span>/g)) {
      // Label words sit in separate tags before the counter ("DEMAND", "MET"),
      // so strip tags from the look-back window before matching.
      const context = html
        .slice(Math.max(0, (match.index ?? 0) - 400), match.index)
        .replace(/<[^>]*>/g, " ");
      const label = context.match(/\b(DEMAND|THERMAL|GAS|NUCLEAR|HYDRO|RENEWABLE|STORAGE|OTHER)\b/g);
      if (!label) continue;
      const key = label[label.length - 1].toLowerCase();
      if (!(key in fields)) fields[key] = num(match[1]);
    }

    if (typeof fields.demand !== "number" || typeof fields.thermal !== "number") return null;

    const mix: FuelMix = {
      thermal: fields.thermal ?? 0,
      gas: fields.gas ?? 0,
      nuclear: fields.nuclear ?? 0,
      hydro: fields.hydro ?? 0,
      renewable: fields.renewable ?? 0,
      storage: fields.storage ?? 0,
      other: fields.other ?? 0,
    };
    const totalGenerationMw = Object.values(mix).reduce((sum, mw) => sum + mw, 0);
    if (totalGenerationMw <= 0) return null;

    return {
      demandMetMw: fields.demand,
      totalGenerationMw,
      mix,
      renewableSharePct: (mix.renewable / totalGenerationMw) * 100,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

type StateListEntry = { StateCode: string; StateName: string };

// POST responses are not stored in Next's data cache, so the state calls run
// on every render — the /grid page's own ISR window is what keeps the load on
// MERIT bounded. Each call gets a hard timeout so one hung socket can never
// stall a render or build.
export async function getStateList(): Promise<Array<{ code: string; name: string }>> {
  try {
    const response = await fetch(`${MERIT}/StateWiseDetails/BindStateListToRedirect`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "User-Agent": ua },
      // "{}" not "": undici sends an empty string body in a way MERIT's IIS
      // waits on forever (curl -d '' works; fetch body:"" times out).
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const list = (await response.json()) as StateListEntry[];
    return list
      .filter((entry) => entry.StateCode && entry.StateName)
      .map((entry) => ({ code: entry.StateCode, name: entry.StateName }));
  } catch {
    return [];
  }
}

type StateStatusEntry = { Demand?: string; ISGS?: string; ImportData?: string };

// MERIT's JSON keys are misleading; its own UI labels them Demand Met /
// Own Generation / Import (ISGS → "Own Generation", ImportData → "Import").
async function getStatePower(state: { code: string; name: string }): Promise<StatePower | null> {
  try {
    const response = await fetch(`${MERIT}/StateWiseDetails/BindCurrentStateStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "User-Agent": ua },
      body: `{StateCode:${JSON.stringify(state.code)}}`,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as StateStatusEntry[];
    const row = rows?.[0];
    if (!row) return null;
    const parse = (value?: string) =>
      value && value !== "-" && value.trim() !== "" ? num(value) : null;
    const demand = parse(row.Demand);
    if (demand === null) return null;
    return {
      code: state.code,
      name: state.name,
      demandMetMw: demand,
      ownGenerationMw: parse(row.ISGS),
      importMw: parse(row.ImportData),
    };
  } catch {
    return null;
  }
}

// Current demand met for every state MERIT lists, sorted by demand.
// ~35 small POSTs, batched so MERIT never sees them all at once.
export async function getStatewisePower(): Promise<StatePower[]> {
  const states = await getStateList();
  if (!states.length) return [];
  const rows: Array<StatePower | null> = [];
  for (let i = 0; i < states.length; i += 8) {
    rows.push(...(await Promise.all(states.slice(i, i + 8).map((state) => getStatePower(state)))));
  }
  return rows
    .filter((row): row is StatePower => row !== null)
    .sort((a, b) => b.demandMetMw - a.demandMetMw);
}
