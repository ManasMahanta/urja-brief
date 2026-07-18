"use client";

import { useEffect, useRef, useState } from "react";

// A real, Google-Maps-style vector map: OpenFreeMap tiles (free, no key), with
// streets, labels, and tilted 3D building extrusions you can zoom into. Our
// charging stations sit on top; "find near me" flies to your location, ranks
// the nearest by real distance, and links out to directions.
//
// MapLibre is loaded from a CDN, not the npm bundle, on purpose: Turbopack does
// not bundle MapLibre's web worker correctly, so bundled vector-tile loading
// silently no-ops (raster loads, streets never do). The CDN ships MapLibre's
// own pre-built worker, which works. Typed loosely since there's no import.

/* eslint-disable @typescript-eslint/no-explicit-any */
const MAPLIBRE_VERSION = "5.6.1";
let maplibrePromise: Promise<any> | null = null;

function loadMapLibre(): Promise<any> {
  const w = window as any;
  if (w.maplibregl) return Promise.resolve(w.maplibregl);
  if (maplibrePromise) return maplibrePromise;
  maplibrePromise = new Promise((resolve, reject) => {
    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link");
      link.id = "maplibre-css";
      link.rel = "stylesheet";
      link.href = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    script.onload = () => resolve((window as any).maplibregl);
    script.onerror = () => reject(new Error("Failed to load the map library."));
    document.head.appendChild(script);
  });
  return maplibrePromise;
}

type Station = {
  name: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
  source: string;
  pricing?: string;
};

type Ranked = Station & { distKm: number };

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const featureCollection = (stations: Station[]): any => ({
  type: "FeatureCollection",
  features: stations.map((s) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [s.lng, s.lat] },
    properties: { name: s.name || "Charging station", city: s.city ?? "", state: s.state ?? "", source: s.source },
  })),
});

export default function MapLibreMap({ stations }: { stations: Station[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mlRef = useRef<any>(null);
  const userMarker = useRef<any>(null);
  const [nearest, setNearest] = useState<Ranked[]>([]);
  const [user, setUser] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<"idle" | "loading" | "error">("idle");
  const [geoMsg, setGeoMsg] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    let map: any = null;
    let resizeTimer: number | undefined;
    let cancelled = false;

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !container.current) return;
        mlRef.current = maplibregl;
        map = new maplibregl.Map({
          container: container.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [80, 22],
          zoom: 3.7,
          pitch: 45,
          bearing: -12,
          maxPitch: 75,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        (window as any).__map = map;
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");
        map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: "metric" }), "bottom-right");
        map.on("error", (e: any) => console.error("MAPLIBRE_ERROR", e.error?.message ?? e));
        requestAnimationFrame(() => map.resize());
        resizeTimer = window.setTimeout(() => map.resize(), 400);
        wireMap(maplibregl, map);
      })
      .catch(() => setLoadError(true));

    const wireMap = (maplibregl: any, map: any) => {
      map.on("load", () => {
        map.addSource("stations", { type: "geojson", data: featureCollection(stations) });
      map.addLayer({
        id: "stations",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 5, 13, 8],
          "circle-color": ["match", ["get", "source"], "e-AMRIT", "#f59e0b", "#0891b2"],
          "circle-opacity": 0.9,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#04121b",
        },
      });

      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "240px" });
      map.on("click", "stations", (event: any) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const [lng, lat] = (feature.geometry as any).coordinates;
        const p = feature.properties as Record<string, string>;
        const where = [p.city, p.state].filter(Boolean).join(", ");
        popup
          .setLngLat([lng, lat])
          .setHTML(
            `<div style="font:13px system-ui;color:#0b1220">
               <strong>${p.name}</strong><br/>
               <span style="color:#475569">${where || "Location on map"} · ${p.source}</span><br/>
               <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" rel="noreferrer" style="color:#0891b2;font-weight:600">Open in Google Maps →</a>
             </div>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", "stations", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "stations", () => (map.getCanvas().style.cursor = ""));
      });
    };

    return () => {
      cancelled = true;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      map?.remove();
      mapRef.current = null;
    };
  }, [stations]);

  const locateAt = (lat: number, lng: number) => {
    const ranked = stations
      .map((s) => ({ ...s, distKm: haversineKm(lat, lng, s.lat, s.lng) }))
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 6);
    setUser({ lat, lng });
    setNearest(ranked);
    setGeo("idle");

    const map = mapRef.current;
    if (map) {
      map.flyTo({ center: [lng, lat], zoom: 13.5, pitch: 58, bearing: -12, duration: 2200 });
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:#fb7185;box-shadow:0 0 0 6px rgba(251,113,133,.3),0 0 14px rgba(251,113,133,.9);border:2px solid #fff";
      userMarker.current?.remove();
      userMarker.current = new mlRef.current.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    }
  };

  const findNearMe = () => {
    if (!("geolocation" in navigator)) {
      setGeo("error");
      setGeoMsg("This browser can't share a location.");
      return;
    }
    setGeo("loading");
    setGeoMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => locateAt(pos.coords.latitude, pos.coords.longitude),
      () => {
        setGeo("error");
        setGeoMsg("Location unavailable — allow location access, or pan the map yourself.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  // Deep link: /ev?near=lat,lng (also the test hook). Runs once the map exists.
  useEffect(() => {
    const near = new URLSearchParams(window.location.search).get("near");
    if (!near) return;
    const [lat, lng] = near.split(",").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const map = mapRef.current;
    if (map?.loaded()) locateAt(lat, lng);
    else map?.once("load", () => locateAt(lat, lng));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusStation = (r: Ranked) => {
    mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 16, pitch: 60, duration: 1800 });
  };

  const mapsDir = (s: { lat: number; lng: number }) =>
    user
      ? `https://www.google.com/maps/dir/?api=1&origin=${user.lat},${user.lng}&destination=${s.lat},${s.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;

  return (
    <div className="relative h-[26rem] w-full overflow-hidden rounded-xl border border-cyan-100/10 sm:h-[34rem]">
      <div ref={container} className="h-full w-full" />

      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={findNearMe}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-cyan-400"
        >
          <span aria-hidden="true">📍</span>
          {geo === "loading" ? "Locating…" : "Find chargers near me"}
        </button>
        {geo === "error" && (
          <p className="max-w-[15rem] rounded-lg border border-rose-300/40 bg-white/95 px-3 py-2 text-right text-xs text-rose-700 shadow">
            {geoMsg}
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-3 rounded-lg bg-white/90 px-3 py-1.5 shadow">
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ background: "#f59e0b" }} aria-hidden="true" /> e-AMRIT
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ background: "#0891b2" }} aria-hidden="true" /> OpenStreetMap
        </span>
      </div>

      {nearest.length > 0 && (
        <div className="absolute bottom-3 right-3 z-10 w-[17rem] max-w-[calc(100%-1.5rem)] rounded-xl border border-cyan-100/15 bg-slate-950/92 p-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[0.62rem] uppercase tracking-wide text-cyan-300">Nearest mapped stations</p>
            <button
              type="button"
              onClick={() => {
                setNearest([]);
                setUser(null);
                userMarker.current?.remove();
              }}
              className="text-xs text-slate-500 hover:text-white"
              aria-label="Clear"
            >
              ✕
            </button>
          </div>
          <ul className="mt-2 divide-y divide-cyan-100/10">
            {nearest.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`} className="py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => focusStation(r)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-medium text-slate-200">
                      {i + 1}. {r.name || "Charging station"}
                    </p>
                    <p className="truncate text-[0.7rem] text-slate-500">
                      {[r.city, r.state].filter(Boolean).join(", ") || r.source}
                    </p>
                  </button>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs text-cyan-200">{r.distKm.toFixed(1)} km</p>
                    <a
                      href={mapsDir(r)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[0.7rem] font-semibold text-cyan-400 hover:text-white"
                    >
                      Directions →
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-cyan-100/10 pt-2 text-[0.62rem] leading-relaxed text-slate-500">
            Nearest among the stations we&apos;ve mapped — not exhaustive. For live availability, check EV
            Yatra or your maps app.
          </p>
        </div>
      )}
    </div>
  );
}
