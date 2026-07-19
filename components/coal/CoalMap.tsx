"use client";

import { useEffect, useRef, useState } from "react";

// India's coal map: power plants (sized by capacity), community-mapped mines,
// and the major coalfields, on the same free OpenFreeMap vector tiles the EV
// map uses. MapLibre is loaded from a CDN on purpose — Turbopack mis-bundles
// its web worker, so the npm build silently fails to load vector tiles.

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

export type Plant = { name: string; mw: number; lat: number; lng: number; owner?: string | null; year?: number | null };
export type Mine = { name: string; lat: number; lng: number; operator?: string | null };
export type Field = { name: string; state: string; type: string; lat: number; lng: number; note?: string };
export type CoalMapProps = { plants: Plant[]; mines: Mine[]; fields: Field[] };

type LayerKey = "plants" | "mines" | "fields";

const plantsFc = (plants: Plant[]): any => ({
  type: "FeatureCollection",
  features: plants.map((p) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: { name: p.name, mw: p.mw, owner: p.owner ?? "", year: p.year ?? "" },
  })),
});
const minesFc = (mines: Mine[]): any => ({
  type: "FeatureCollection",
  features: mines.map((m) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [m.lng, m.lat] },
    properties: { name: m.name, operator: m.operator ?? "" },
  })),
});
const fieldsFc = (fields: Field[]): any => ({
  type: "FeatureCollection",
  features: fields.map((f) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [f.lng, f.lat] },
    properties: { name: f.name, state: f.state, ftype: f.type, note: f.note ?? "" },
  })),
});

const gmaps = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export default function CoalMap({ plants, mines, fields }: CoalMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({ plants: true, mines: true, fields: true });

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    let map: any = null;
    let resizeTimer: number | undefined;
    let cancelled = false;

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !container.current) return;
        map = new maplibregl.Map({
          container: container.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [82, 22.5],
          zoom: 3.7,
          pitch: 40,
          bearing: -10,
          maxPitch: 75,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");
        map.on("error", (e: any) => console.error("MAPLIBRE_ERROR", e.error?.message ?? e));
        requestAnimationFrame(() => map.resize());
        resizeTimer = window.setTimeout(() => map.resize(), 400);

        const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "260px" });
        const showPopup = (lng: number, lat: number, html: string) =>
          popup.setLngLat([lng, lat]).setHTML(`<div style="font:13px system-ui;color:#0b1220">${html}</div>`).addTo(map);

        map.on("load", () => {
          map.addSource("coal-plants", { type: "geojson", data: plantsFc(plants) });
          map.addSource("coal-mines", { type: "geojson", data: minesFc(mines) });
          map.addSource("coal-fields", { type: "geojson", data: fieldsFc(fields) });

          // Mines — small rose dots underneath.
          map.addLayer({
            id: "mines",
            type: "circle",
            source: "coal-mines",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 4, 13, 6],
              "circle-color": "#fb7185",
              "circle-opacity": 0.85,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#04121b",
            },
          });
          // Plants — amber, radius scaled by capacity.
          map.addLayer({
            id: "plants",
            type: "circle",
            source: "coal-plants",
            paint: {
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                3, ["interpolate", ["linear"], ["get", "mw"], 100, 2.5, 2000, 6, 4800, 10],
                9, ["interpolate", ["linear"], ["get", "mw"], 100, 5, 2000, 13, 4800, 22],
              ],
              "circle-color": "#f59e0b",
              "circle-opacity": 0.82,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#3b1d02",
            },
          });
          // Fields — cyan ringed markers on top.
          map.addLayer({
            id: "fields",
            type: "circle",
            source: "coal-fields",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 7, 13, 10],
              "circle-color": "rgba(34,211,238,0.18)",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#22d3ee",
            },
          });

          map.on("click", "plants", (e: any) => {
            const f = e.features?.[0]; if (!f) return;
            const [lng, lat] = (f.geometry as any).coordinates; const p = f.properties as any;
            showPopup(lng, lat, `<strong>${p.name}</strong><br/><span style="color:#b45309;font-weight:600">${Number(p.mw).toLocaleString("en-IN")} MW coal</span>${p.owner ? `<br/><span style="color:#475569">${p.owner}${p.year ? ` · since ${p.year}` : ""}</span>` : ""}<br/><a href="${gmaps(lat, lng)}" target="_blank" rel="noreferrer" style="color:#0891b2;font-weight:600">Open in Google Maps →</a>`);
          });
          map.on("click", "mines", (e: any) => {
            const f = e.features?.[0]; if (!f) return;
            const [lng, lat] = (f.geometry as any).coordinates; const p = f.properties as any;
            showPopup(lng, lat, `<strong>${p.name}</strong><br/><span style="color:#475569">Coal mine (OSM)${p.operator ? ` · ${p.operator}` : ""}</span><br/><a href="${gmaps(lat, lng)}" target="_blank" rel="noreferrer" style="color:#0891b2;font-weight:600">Open in Google Maps →</a>`);
          });
          map.on("click", "fields", (e: any) => {
            const f = e.features?.[0]; if (!f) return;
            const [lng, lat] = (f.geometry as any).coordinates; const p = f.properties as any;
            showPopup(lng, lat, `<strong>${p.name} coalfield</strong><br/><span style="color:#0e7490;font-weight:600">${p.ftype}</span> · <span style="color:#475569">${p.state}</span>${p.note ? `<br/><span style="color:#475569">${p.note}</span>` : ""}`);
          });
          for (const id of ["plants", "mines", "fields"]) {
            map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
            map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
          }
        });
      })
      .catch(() => setLoadError(true));

    return () => {
      cancelled = true;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      map?.remove();
      mapRef.current = null;
    };
  }, [plants, mines, fields]);

  const toggle = (key: LayerKey) => {
    const next = !visible[key];
    setVisible((v) => ({ ...v, [key]: next }));
    const map = mapRef.current;
    if (map?.getLayer(key)) map.setLayoutProperty(key, "visibility", next ? "visible" : "none");
  };

  if (loadError) {
    return (
      <div className="flex h-[26rem] w-full items-center justify-center rounded-xl border border-rose-300/20 bg-[#05070d] p-6 text-center sm:h-[34rem]">
        <p className="text-sm text-slate-400">The map library couldn&apos;t load. The directory below has the full list.</p>
      </div>
    );
  }

  const legend: Array<{ key: LayerKey; label: string; dot: string; ring?: boolean }> = [
    { key: "plants", label: `Power plants (${plants.length})`, dot: "#f59e0b" },
    { key: "mines", label: `Mapped mines (${mines.length})`, dot: "#fb7185" },
    { key: "fields", label: `Coalfields (${fields.length})`, dot: "#22d3ee", ring: true },
  ];

  return (
    <div className="relative h-[26rem] w-full overflow-hidden rounded-xl border border-cyan-100/10 sm:h-[34rem]">
      <div ref={container} className="h-full w-full" />
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 rounded-lg bg-white/90 px-3 py-2 shadow">
        {legend.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => toggle(l.key)}
            className="inline-flex items-center gap-2 text-[0.72rem] font-medium text-slate-700 transition"
            style={{ opacity: visible[l.key] ? 1 : 0.4 }}
            aria-pressed={visible[l.key]}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={l.ring ? { background: "rgba(34,211,238,0.25)", border: `2px solid ${l.dot}` } : { background: l.dot }}
              aria-hidden="true"
            />
            {l.label}
          </button>
        ))}
        <span className="mt-0.5 text-[0.6rem] text-slate-400">tap to toggle · circle size = MW</span>
      </div>
    </div>
  );
}
