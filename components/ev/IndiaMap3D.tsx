"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { StateShape } from "@/lib/ev";

// Interactive 3D India: extruded state plates on a dark stage with charging
// stations as glowing points above them. Drag to rotate, scroll to zoom,
// hover a state for its mapped-station count. Runs entirely client-side;
// geometry comes from the compact dissolved-state file in data/ev/.

type StationPoint = { lat: number; lng: number; source: string };

// Equirectangular-ish projection centred on India; y is north.
const px = (lng: number) => (lng - 82.5) * 1.0;
const pz = (lat: number) => -(lat - 22.5) * 1.0;

const BASE_H = 0.35;
const MAX_RISE = 5.5; // tallest state's extra height above the base plate

// Height encodes mapped-station count (square-root so a few dense states don't
// dwarf the rest), turning the map into a 3D bar chart on the country outline.
function stateHeight(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return BASE_H;
  return BASE_H + Math.sqrt(count / maxCount) * MAX_RISE;
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
        const y = -pz(lat); // Shape lives in XY; we rotate the mesh to lie flat
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      return shape;
    });
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: height, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [state, height]);

  // Warmer, brighter for denser states — a redundant magnitude cue alongside height.
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

function Stations({
  stations,
  states,
  countsByState,
  maxCount,
}: {
  stations: StationPoint[];
  states: StateShape[];
  countsByState: Record<string, number>;
  maxCount: number;
}) {
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(stations.length * 3);
    const col = new Float32Array(stations.length * 3);
    const eamrit = new THREE.Color("#fbbf24");
    const osm = new THREE.Color("#67e8f9");
    stations.forEach((s, i) => {
      // Sit each charger on top of its state's bar so points read as
      // belonging to the surface, not floating over it.
      const state = states.find((st) => st.polys.some((ring) => inRing(s.lng, s.lat, ring)));
      const h = stateHeight(state ? countsByState[state.name] ?? 0 : 0, maxCount);
      pos[i * 3] = px(s.lng);
      pos[i * 3 + 1] = h + 0.12;
      pos[i * 3 + 2] = pz(s.lat);
      const c = s.source === "e-AMRIT" ? eamrit : osm;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    });
    return { positions: pos, colors: col };
  }, [stations, states, countsByState, maxCount]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.28}
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

export default function IndiaMap3D({
  states,
  stations,
  countsByState,
}: {
  states: StateShape[];
  stations: StationPoint[];
  countsByState: Record<string, number>;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxCount = useMemo(
    () => Math.max(1, ...Object.values(countsByState)),
    [countsByState],
  );

  return (
    <div className="relative h-[26rem] w-full overflow-hidden rounded-xl border border-cyan-100/10 bg-[#05070d] sm:h-[32rem]">
      <Canvas camera={{ position: [1, 20, 30], fov: 40 }} dpr={[1, 2]}>
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
              hovered={hovered === state.name}
              onHover={setHovered}
            />
          ))}
          <Stations
            stations={stations}
            states={states}
            countsByState={countsByState}
            maxCount={maxCount}
          />
        </group>
        <OrbitControls
          autoRotate={!hovered}
          autoRotateSpeed={0.5}
          enablePan={false}
          minDistance={16}
          maxDistance={52}
          minPolarAngle={0.25}
          maxPolarAngle={1.3}
        />
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-cyan-100/15 bg-slate-950/80 px-3 py-2 backdrop-blur">
        {hovered ? (
          <>
            <p className="text-sm font-semibold text-white">{hovered}</p>
            <p className="font-mono text-xs text-cyan-200/85">
              {(countsByState[hovered] ?? 0).toLocaleString("en-IN")} mapped station
              {(countsByState[hovered] ?? 0) === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-400">
              Drag to rotate · scroll to zoom · hover a state
            </p>
            <p className="mt-0.5 text-[0.62rem] text-slate-500">Taller state = more mapped stations</p>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-4 rounded-lg border border-cyan-100/15 bg-slate-950/80 px-3 py-1.5 backdrop-blur">
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
