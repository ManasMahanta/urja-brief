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

function StateMesh({
  state,
  count,
  hovered,
  onHover,
}: {
  state: StateShape;
  count: number;
  hovered: boolean;
  onHover: (name: string | null) => void;
}) {
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
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: BASE_H, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [state]);

  return (
    <mesh
      geometry={geometry}
      position={[0, hovered ? 0.12 : 0, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(state.name);
      }}
      onPointerOut={() => onHover(null)}
    >
      <meshStandardMaterial
        color={hovered ? "#164e63" : "#0b2436"}
        emissive={hovered ? "#22d3ee" : count > 0 ? "#0e7490" : "#0f172a"}
        emissiveIntensity={hovered ? 0.55 : count > 0 ? 0.18 : 0.06}
        metalness={0.15}
        roughness={0.75}
      />
    </mesh>
  );
}

function Stations({ stations }: { stations: StationPoint[] }) {
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(stations.length * 3);
    const col = new Float32Array(stations.length * 3);
    const eamrit = new THREE.Color("#f59e0b");
    const osm = new THREE.Color("#22d3ee");
    stations.forEach((s, i) => {
      pos[i * 3] = px(s.lng);
      pos[i * 3 + 1] = BASE_H + 0.16;
      pos[i * 3 + 2] = pz(s.lat);
      const c = s.source === "e-AMRIT" ? eamrit : osm;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    });
    return { positions: pos, colors: col };
  }, [stations]);

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

  return (
    <div className="relative h-[26rem] w-full overflow-hidden rounded-xl border border-cyan-100/10 bg-[#05070d] sm:h-[30rem]">
      <Canvas camera={{ position: [0, 26, 24], fov: 38 }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[12, 30, 10]} intensity={1.1} color="#bfe8ff" />
        <directionalLight position={[-14, 12, -8]} intensity={0.3} color="#38bdf8" />
        <group>
          {states.map((state) => (
            <StateMesh
              key={state.name}
              state={state}
              count={countsByState[state.name] ?? 0}
              hovered={hovered === state.name}
              onHover={setHovered}
            />
          ))}
          <Stations stations={stations} />
        </group>
        <OrbitControls
          autoRotate={!hovered}
          autoRotateSpeed={0.55}
          enablePan={false}
          minDistance={14}
          maxDistance={46}
          minPolarAngle={0.35}
          maxPolarAngle={1.25}
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
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-400">
            Drag to rotate · scroll to zoom · hover a state
          </p>
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
