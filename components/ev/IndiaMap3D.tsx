"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { StateShape } from "@/lib/ev";

// Interactive 3D India charging map with a "find chargers near me" flow:
// browser geolocation (or a ?near=lat,lng deep link) drops a marker, flies the
// camera in, and ranks the nearest mapped stations by real distance. States
// are extruded by mapped-station count; every station is individually
// hoverable and clickable.

type Station = {
  name: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
  source: string;
  pricing?: string;
};

// Equirectangular-ish projection centred on India; y is north.
const px = (lng: number) => lng - 82.5;
const pz = (lat: number) => -(lat - 22.5);

const BASE_H = 0.35;
const MAX_RISE = 5.5;

function stateHeight(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return BASE_H;
  return BASE_H + Math.sqrt(count / maxCount) * MAX_RISE;
}

// Ray-cast point-in-polygon, ring coords [lng, lat].
function inRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Great-circle distance in km.
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function StateMesh({
  state,
  count,
  maxCount,
  hovered,
  onHover,
}: {
  state: StateShape;
  count: number;
  maxCount: number;
  hovered: boolean;
  onHover: (name: string | null) => void;
}) {
  const height = stateHeight(count, maxCount);
  const geometry = useMemo(() => {
    const shapes = state.polys.map((ring) => {
      const shape = new THREE.Shape();
      ring.forEach(([lng, lat], i) => {
        const x = px(lng);
        const y = -pz(lat);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      return shape;
    });
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: height, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [state, height]);

  const t = maxCount > 0 ? Math.min(1, count / maxCount) : 0;
  const top = new THREE.Color("#0b2436").lerp(new THREE.Color("#22d3ee"), 0.15 + t * 0.5);

  return (
    <mesh
      geometry={geometry}
      position={[0, hovered ? 0.15 : 0, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(state.name);
      }}
      onPointerOut={() => onHover(null)}
    >
      <meshStandardMaterial
        color={hovered ? "#22d3ee" : top}
        emissive={hovered ? "#22d3ee" : "#0e7490"}
        emissiveIntensity={hovered ? 0.6 : 0.1 + t * 0.35}
        metalness={0.2}
        roughness={0.65}
      />
    </mesh>
  );
}

type Focus = { target: THREE.Vector3; pos: THREE.Vector3; frames: number };

// Smoothly eases the camera + orbit target toward a requested focus for a few
// frames, then hands control back to the user.
function FocusRig({
  controls,
  focusRef,
}: {
  controls: React.MutableRefObject<any>;
  focusRef: React.MutableRefObject<Focus | null>;
}) {
  useFrame(({ camera }) => {
    const f = focusRef.current;
    if (!f || f.frames <= 0 || !controls.current) return;
    controls.current.target.lerp(f.target, 0.12);
    camera.position.lerp(f.pos, 0.12);
    controls.current.update();
    f.frames -= 1;
  });
  return null;
}

function Stations({
  positions,
  colors,
  onHover,
  onSelect,
}: {
  positions: Float32Array;
  colors: Float32Array;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}) {
  return (
    <points
      onPointerMove={(event) => {
        event.stopPropagation();
        if (event.index != null) onHover(event.index);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        if (event.index != null) onSelect(event.index);
      }}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

type Ranked = Station & { index: number; distKm: number };

export default function IndiaMap3D({
  states,
  stations,
  countsByState,
}: {
  states: StateShape[];
  stations: Station[];
  countsByState: Record<string, number>;
}) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [user, setUser] = useState<{ lat: number; lng: number } | null>(null);
  const [nearest, setNearest] = useState<Ranked[]>([]);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "error">("idle");
  const [geoMsg, setGeoMsg] = useState("");
  const [flying, setFlying] = useState(false);

  const controls = useRef<any>(null);
  const focusRef = useRef<Focus | null>(null);

  const maxCount = useMemo(() => Math.max(1, ...Object.values(countsByState)), [countsByState]);

  // Station 3D positions (sitting on their state's bar) + colours + vectors.
  const { positions, colors, vecs } = useMemo(() => {
    const pos = new Float32Array(stations.length * 3);
    const col = new Float32Array(stations.length * 3);
    const vs: THREE.Vector3[] = [];
    const eamrit = new THREE.Color("#fbbf24");
    const osm = new THREE.Color("#67e8f9");
    stations.forEach((s, i) => {
      const state = states.find((st) => st.polys.some((ring) => inRing(s.lng, s.lat, ring)));
      const h = stateHeight(state ? countsByState[state.name] ?? 0 : 0, maxCount) + 0.12;
      const x = px(s.lng);
      const z = pz(s.lat);
      pos[i * 3] = x;
      pos[i * 3 + 1] = h;
      pos[i * 3 + 2] = z;
      vs.push(new THREE.Vector3(x, h, z));
      const c = s.source === "e-AMRIT" ? eamrit : osm;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    });
    return { positions: pos, colors: col, vecs: vs };
  }, [stations, states, countsByState, maxCount]);

  // Regional zoom: close enough to read the nearby cluster, far enough to keep
  // the user's marker and surroundings in frame. Camera sits high and slightly
  // south, looking down at the point.
  const flyTo = (lat: number, lng: number, close = 14) => {
    const target = new THREE.Vector3(px(lng), 0.6, pz(lat));
    focusRef.current = {
      target,
      pos: target.clone().add(new THREE.Vector3(0.5, close * 1.05, close * 0.85)),
      frames: 55,
    };
    // Suspend auto-rotate while the camera eases in, so the two don't fight;
    // it resumes as a slow orbit around the new target afterwards.
    setFlying(true);
    window.setTimeout(() => setFlying(false), 1100);
  };

  const locateAt = (lat: number, lng: number) => {
    const ranked = stations
      .map((s, index) => ({ ...s, index, distKm: haversineKm(lat, lng, s.lat, s.lng) }))
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 6);
    setUser({ lat, lng });
    setNearest(ranked);
    setGeoState("idle");
    flyTo(lat, lng, 13);
  };

  const findNearMe = () => {
    if (!("geolocation" in navigator)) {
      setGeoState("error");
      setGeoMsg("This browser can't share a location.");
      return;
    }
    setGeoState("loading");
    setGeoMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => locateAt(pos.coords.latitude, pos.coords.longitude),
      () => {
        setGeoState("error");
        setGeoMsg("Location unavailable — allow location access, or search a city on the map.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  // Deep link: /ev?near=lat,lng (also how the feature is verified).
  useEffect(() => {
    const near = new URLSearchParams(window.location.search).get("near");
    if (!near) return;
    const [lat, lng] = near.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) locateAt(lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusStation = (r: Ranked) => {
    setSelIdx(r.index);
    flyTo(r.lat, r.lng, 9);
  };

  const hoverStation = hoverIdx != null ? stations[hoverIdx] : null;
  const selStation = selIdx != null ? stations[selIdx] : null;
  const userVec = user ? new THREE.Vector3(px(user.lng), 0.8, pz(user.lat)) : null;
  const mapsDir = (s: { lat: number; lng: number }) =>
    user
      ? `https://www.google.com/maps/dir/?api=1&origin=${user.lat},${user.lng}&destination=${s.lat},${s.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;

  return (
    <div className="relative h-[26rem] w-full overflow-hidden rounded-xl border border-cyan-100/10 bg-[#05070d] sm:h-[34rem]">
      <Canvas
        camera={{ position: [1, 20, 30], fov: 40 }}
        dpr={[1, 2]}
        onCreated={({ raycaster }) => {
          // Fatter hit target so individual station points are easy to pick.
          raycaster.params.Points.threshold = 0.4;
        }}
        onPointerMissed={() => setSelIdx(null)}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[12, 30, 10]} intensity={1.15} color="#bfe8ff" />
        <directionalLight position={[-16, 10, -6]} intensity={0.35} color="#38bdf8" />
        <group>
          {states.map((state) => (
            <StateMesh
              key={state.name}
              state={state}
              count={countsByState[state.name] ?? 0}
              maxCount={maxCount}
              hovered={hoveredState === state.name}
              onHover={setHoveredState}
            />
          ))}
          <Stations positions={positions} colors={colors} onHover={setHoverIdx} onSelect={setSelIdx} />

          {hoverIdx != null && vecs[hoverIdx] && (
            <mesh position={vecs[hoverIdx]}>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          )}
          {selIdx != null && vecs[selIdx] && (
            <mesh position={vecs[selIdx]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.32, 0.06, 8, 24]} />
              <meshBasicMaterial color="#22d3ee" />
            </mesh>
          )}

          {userVec && (
            <group position={userVec}>
              {/* "You are here": glowing sphere, a beam, and a ground ring. */}
              <mesh>
                <sphereGeometry args={[0.42, 20, 20]} />
                <meshBasicMaterial color="#fb7185" />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.7, 20, 20]} />
                <meshBasicMaterial color="#fb7185" transparent opacity={0.25} />
              </mesh>
              <mesh position={[0, 3, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 6, 8]} />
                <meshBasicMaterial color="#fb7185" transparent opacity={0.55} />
              </mesh>
              <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.85, 0.09, 10, 32]} />
                <meshBasicMaterial color="#fb7185" />
              </mesh>
            </group>
          )}
        </group>
        <OrbitControls
          ref={controls}
          // Rotation keeps the scene alive; it pauses on hover and during a
          // fly-in, and drifts slowly around your location once focused.
          autoRotate={!flying && hoveredState == null && hoverIdx == null}
          autoRotateSpeed={user ? 0.18 : 0.5}
          enablePan
          minDistance={4}
          maxDistance={55}
          minPolarAngle={0.2}
          maxPolarAngle={1.32}
        />
        <FocusRig controls={controls} focusRef={focusRef} />
      </Canvas>

      {/* Find-near-me control */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={findNearMe}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-cyan-200"
        >
          <span aria-hidden="true">📍</span>
          {geoState === "loading" ? "Locating…" : "Find chargers near me"}
        </button>
        {geoState === "error" && (
          <p className="max-w-[15rem] rounded-lg border border-rose-300/30 bg-rose-950/70 px-3 py-2 text-right text-xs text-rose-200 backdrop-blur">
            {geoMsg}
          </p>
        )}
      </div>

      {/* Hint / hover readout */}
      <div className="pointer-events-none absolute left-3 top-3 max-w-[16rem] rounded-lg border border-cyan-100/15 bg-slate-950/80 px-3 py-2 backdrop-blur">
        {hoverStation ? (
          <>
            <p className="text-sm font-semibold text-white">{hoverStation.name || "Charging station"}</p>
            <p className="text-xs text-slate-400">
              {[hoverStation.city, hoverStation.state].filter(Boolean).join(", ") || "Location on map"} ·{" "}
              {hoverStation.source}
            </p>
          </>
        ) : hoveredState ? (
          <>
            <p className="text-sm font-semibold text-white">{hoveredState}</p>
            <p className="font-mono text-xs text-cyan-200/85">
              {(countsByState[hoveredState] ?? 0).toLocaleString("en-IN")} mapped stations
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-400">
              Drag · scroll to zoom · hover a station
            </p>
            <p className="mt-0.5 text-[0.62rem] text-slate-500">Taller state = more mapped stations</p>
          </>
        )}
      </div>

      {/* Nearest-to-me panel */}
      {nearest.length > 0 && (
        <div className="absolute bottom-3 right-3 w-[17rem] max-w-[calc(100%-1.5rem)] rounded-xl border border-cyan-100/15 bg-slate-950/90 p-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[0.62rem] uppercase tracking-wide text-cyan-300">
              Nearest mapped stations
            </p>
            <button
              type="button"
              onClick={() => {
                setNearest([]);
                setUser(null);
              }}
              className="text-xs text-slate-500 hover:text-white"
              aria-label="Clear"
            >
              ✕
            </button>
          </div>
          <ul className="mt-2 divide-y divide-cyan-100/10">
            {nearest.map((r, i) => (
              <li key={r.index} className="py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => focusStation(r)}
                    className="min-w-0 flex-1 text-left"
                  >
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
            Nearest among the stations we&apos;ve mapped — not exhaustive. For live availability, check
            EV Yatra or your maps app.
          </p>
        </div>
      )}

      {/* Selected-station card (from clicking a point) */}
      {selStation && (
        <div className="absolute bottom-3 left-3 w-[15rem] rounded-xl border border-cyan-100/15 bg-slate-950/90 p-3 backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-white">{selStation.name || "Charging station"}</p>
            <button
              type="button"
              onClick={() => setSelIdx(null)}
              className="text-xs text-slate-500 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {[selStation.city, selStation.state].filter(Boolean).join(", ") || "Location on map"}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-slate-500">
            Source: {selStation.source}
            {selStation.pricing ? ` · ${selStation.pricing}` : ""}
          </p>
          <a
            href={mapsDir(selStation)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-cyan-400 hover:text-white"
          >
            Open in Google Maps →
          </a>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-4 rounded-lg border border-cyan-100/15 bg-slate-950/80 px-3 py-1.5 backdrop-blur data-[hide=true]:hidden" data-hide={!!selStation}>
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" /> e-AMRIT
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" /> OpenStreetMap
        </span>
      </div>
    </div>
  );
}
