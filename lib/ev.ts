import fs from "node:fs";
import path from "node:path";

// EV charging-station data, with the coverage story told honestly:
//
//   • e-AMRIT (NITI Aayog) — a live, keyless JSON endpoint, but it serves the
//     old EESL-era pilot list (~160 stations). Real coordinates, tiny slice.
//   • OpenStreetMap (Overpass) — community-mapped charging stations, fetched
//     server-side. Thousands of points, city-skewed, nobody guarantees them.
//   • The full official registry (BEE's EV Yatra, ~29k+ public stations) has
//     no open bulk feed we could verify — the page must say so rather than
//     pretend the mapped subset is the universe.
//
// Every fetcher degrades gracefully; the committed e-AMRIT snapshot is the
// floor so the map is never empty.

export type ChargingStation = {
  name: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
  pricing?: string;
  source: "e-AMRIT" | "OSM";
};

const inIndia = (lat: number, lng: number) => lat > 6 && lat < 38 && lng > 66 && lng < 100;

function snapshotStations(): ChargingStation[] {
  try {
    const file = path.join(process.cwd(), "data/ev/eamrit-snapshot.json");
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
      stations: Array<Omit<ChargingStation, "source">>;
    };
    return data.stations.map((s) => ({ ...s, source: "e-AMRIT" as const }));
  } catch {
    return [];
  }
}

// e-AMRIT live, falling back to the committed snapshot.
async function getEamritStations(): Promise<ChargingStation[]> {
  try {
    const response = await fetch("https://e-amrit.niti.gov.in/getChargingStation", {
      next: { revalidate: 86400 },
      headers: { "User-Agent": "Mozilla/5.0 UrjaBrief/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return snapshotStations();
    const rows = (await response.json()) as Array<Record<string, string>>;
    const stations = rows
      .map((row) => {
        const lat = Number(row.lattitude);
        const lng = Number(row.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inIndia(lat, lng)) return null;
        return {
          name: (row.name ?? "").trim(),
          city: (row.city ?? "").trim(),
          state: (row.state ?? "").trim(),
          lat,
          lng,
          pricing: (row.pricing ?? "").trim(),
          source: "e-AMRIT" as const,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
    return stations.length ? stations : snapshotStations();
  } catch {
    return snapshotStations();
  }
}

function osmSnapshot(): ChargingStation[] {
  try {
    const file = path.join(process.cwd(), "data/ev/osm-snapshot.json");
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
      stations: Array<{ name: string; lat: number; lng: number }>;
    };
    return data.stations.map((s) => ({ ...s, source: "OSM" as const }));
  } catch {
    return [];
  }
}

// OSM charging stations across India via Overpass, falling back to the
// committed snapshot. The Accept header is load-bearing: Overpass returns
// 406 Not Acceptable without it. Center points only.
async function getOsmStations(): Promise<ChargingStation[]> {
  const query =
    '[out:json][timeout:50];node["amenity"="charging_station"](6.5,68,36,97.5);out body 6000;';
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "UrjaBrief/1.0 (urja-brief.vercel.app)",
      },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return osmSnapshot();
    const data = (await response.json()) as {
      elements?: Array<{ lat: number; lon: number; tags?: Record<string, string> }>;
    };
    const live = (data.elements ?? [])
      .filter((el) => inIndia(el.lat, el.lon))
      .map((el) => ({
        name: el.tags?.name ?? el.tags?.operator ?? "Charging station",
        lat: el.lat,
        lng: el.lon,
        source: "OSM" as const,
      }));
    return live.length ? live : osmSnapshot();
  } catch {
    return osmSnapshot();
  }
}

export async function getChargingStations(): Promise<{
  stations: ChargingStation[];
  bySource: Record<string, number>;
}> {
  const [eamrit, osm] = await Promise.all([getEamritStations(), getOsmStations()]);
  // Dedupe stations within ~300m of an e-AMRIT point (coarse grid match).
  const seen = new Set(eamrit.map((s) => `${s.lat.toFixed(2)},${s.lng.toFixed(2)}`));
  const merged = [
    ...eamrit,
    ...osm.filter((s) => !seen.has(`${s.lat.toFixed(2)},${s.lng.toFixed(2)}`)),
  ];
  return {
    stations: merged,
    bySource: {
      "e-AMRIT": eamrit.length,
      OSM: merged.length - eamrit.length,
    },
  };
}

// Official year-wise PCS counts from data.gov.in (Ministry of Heavy
// Industries). Needs a free personal API key — the shared sample key is
// permanently rate-limited. Panel simply doesn't render without it.
export type OfficialCount = Record<string, string>;

export async function getOfficialCounts(): Promise<OfficialCount[]> {
  const key = process.env.DATA_GOV_IN_KEY;
  if (!key) return [];
  try {
    const response = await fetch(
      `https://api.data.gov.in/resource/e32ef57a-40da-48d2-b65e-d1eb0419e53d?api-key=${key}&format=json&limit=100`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(12_000) },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { records?: OfficialCount[] };
    return data.records ?? [];
  } catch {
    return [];
  }
}

// Simplified state outlines (dissolved from district boundaries, see
// data/ev/india-states.json) for the 3D map.
export type StateShape = { name: string; polys: number[][][] };

export function getIndiaStates(): StateShape[] {
  try {
    const file = path.join(process.cwd(), "data/ev/india-states.json");
    return (JSON.parse(fs.readFileSync(file, "utf8")) as { states: StateShape[] }).states;
  } catch {
    return [];
  }
}

// Ray-cast point-in-polygon, ring coords are [lng, lat].
function inRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Attribute every station to a state via its outline, so the map's hover
// counts include OSM points (which carry no state field of their own).
export function countStationsByState(
  stations: ChargingStation[],
  states: StateShape[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const station of stations) {
    for (const state of states) {
      if (state.polys.some((ring) => inRing(station.lng, station.lat, ring))) {
        counts[state.name] = (counts[state.name] ?? 0) + 1;
        break;
      }
    }
  }
  return counts;
}
