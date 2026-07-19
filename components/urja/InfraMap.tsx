"use client";

import { useEffect, useRef, useState } from "react";

// A reusable energy-infrastructure map: give it named layers of points (some
// sized by capacity) and it renders them on the free OpenFreeMap vector tiles
// with a toggleable legend and click popups. MapLibre is loaded from a CDN on
// purpose — Turbopack mis-bundles its web worker, so the npm build silently
// fails to load vector tiles.

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

export type InfraPoint = { name: string; lat: number; lng: number; mw?: number | null; sub?: string };
export type InfraLayer = {
  id: string;
  label: string;
  color: string;
  ring?: boolean;
  sizeByMw?: boolean;
  points: InfraPoint[];
};
export type InfraMapProps = { layers: InfraLayer[] };

const gmaps = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
const fc = (points: InfraPoint[]): any => ({
  type: "FeatureCollection",
  features: points.map((p) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: { name: p.name, mw: p.mw ?? "", sub: p.sub ?? "" },
  })),
});

export default function InfraMap({ layers }: InfraMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(layers.map((l) => [l.id, true])),
  );

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
          center: [80, 22.5],
          zoom: 3.6,
          pitch: 38,
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

        map.on("load", () => {
          // Draw in reverse so the first-listed layer sits on top.
          for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            map.addSource(layer.id, { type: "geojson", data: fc(layer.points) });
            const radius = layer.sizeByMw
              ? [
                  "interpolate", ["linear"], ["zoom"],
                  3, ["interpolate", ["linear"], ["coalesce", ["to-number", ["get", "mw"]], 5], 5, 2.5, 500, 6, 1000, 9],
                  9, ["interpolate", ["linear"], ["coalesce", ["to-number", ["get", "mw"]], 5], 5, 4, 500, 14, 1000, 22],
                ]
              : ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 7, 13, 10];
            map.addLayer({
              id: layer.id,
              type: "circle",
              source: layer.id,
              paint: {
                "circle-radius": radius as any,
                "circle-color": layer.ring ? "rgba(255,255,255,0.12)" : layer.color,
                "circle-opacity": layer.ring ? 1 : 0.82,
                "circle-stroke-width": layer.ring ? 2 : 1,
                "circle-stroke-color": layer.ring ? layer.color : "#04121b",
              },
            });
            map.on("click", layer.id, (e: any) => {
              const f = e.features?.[0];
              if (!f) return;
              const [lng, lat] = (f.geometry as any).coordinates;
              const p = f.properties as any;
              const mwLine = p.mw !== "" && p.mw != null ? `<br/><span style="color:#b45309;font-weight:600">${Number(p.mw).toLocaleString("en-IN")} MW</span>` : "";
              const subLine = p.sub ? `<br/><span style="color:#475569">${p.sub}</span>` : "";
              popup
                .setLngLat([lng, lat])
                .setHTML(
                  `<div style="font:13px system-ui;color:#0b1220"><strong>${p.name}</strong>${mwLine}${subLine}<br/><a href="${gmaps(lat, lng)}" target="_blank" rel="noreferrer" style="color:#0891b2;font-weight:600">Open in Google Maps →</a></div>`,
                )
                .addTo(map);
            });
            map.on("mouseenter", layer.id, () => (map.getCanvas().style.cursor = "pointer"));
            map.on("mouseleave", layer.id, () => (map.getCanvas().style.cursor = ""));
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
  }, [layers]);

  const toggle = (id: string) => {
    const next = !visible[id];
    setVisible((v) => ({ ...v, [id]: next }));
    const map = mapRef.current;
    if (map?.getLayer(id)) map.setLayoutProperty(id, "visibility", next ? "visible" : "none");
  };

  if (loadError) {
    return (
      <div className="flex h-[26rem] w-full items-center justify-center rounded-xl border border-rose-300/20 bg-[#05070d] p-6 text-center sm:h-[34rem]">
        <p className="text-sm text-slate-400">The map library couldn&apos;t load. The directory below has the full list.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[26rem] w-full overflow-hidden rounded-xl border border-cyan-100/10 sm:h-[34rem]">
      <div ref={container} className="h-full w-full" />
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 rounded-lg bg-white/90 px-3 py-2 shadow">
        {layers.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => toggle(l.id)}
            className="inline-flex items-center gap-2 text-[0.72rem] font-medium text-slate-700 transition"
            style={{ opacity: visible[l.id] ? 1 : 0.4 }}
            aria-pressed={visible[l.id]}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={l.ring ? { background: "rgba(255,255,255,0.2)", border: `2px solid ${l.color}` } : { background: l.color }}
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
