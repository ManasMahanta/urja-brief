"use client";

// Capital-flow globe: a dotted Earth with great-circle arcs streaming from the
// world's financial hubs into Mumbai, particles riding each arc to represent
// inbound/outbound flow, and a soft atmosphere. WebGL only renders after mount
// (never during SSR); reduced-motion and no-canvas users get a CSS fallback.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const R = 1;

type Hub = { name: string; lat: number; lon: number; inflow: boolean };
const MUMBAI = { lat: 19.07, lon: 72.87 };
const HUBS: Hub[] = [
  { name: "New York", lat: 40.71, lon: -74.0, inflow: true },
  { name: "London", lat: 51.5, lon: -0.12, inflow: true },
  { name: "Singapore", lat: 1.35, lon: 103.8, inflow: true },
  { name: "Hong Kong", lat: 22.3, lon: 114.1, inflow: false },
  { name: "Tokyo", lat: 35.68, lon: 139.69, inflow: true },
  { name: "Dubai", lat: 25.2, lon: 55.27, inflow: true },
  { name: "Frankfurt", lat: 50.11, lon: 8.68, inflow: false },
];

function latLonToVec3(lat: number, lon: number, r = R): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

// Great-circle-ish arc: interpolate between two surface points, normalize onto
// the sphere, and lift the middle outward so the arc bows above the surface.
function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segments = 48): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const lift = 0.28 + a.distanceTo(b) * 0.14;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(a, b, t).normalize();
    const alt = R + Math.sin(Math.PI * t) * lift;
    pts.push(p.multiplyScalar(alt));
  }
  return pts;
}

function DottedGlobe() {
  // Fibonacci sphere of points for a clean "data" surface.
  const geom = useMemo(() => {
    const N = 1400;
    const positions = new Float32Array(N * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      positions[i * 3] = Math.cos(theta) * radius * R;
      positions[i * 3 + 1] = y * R;
      positions[i * 3 + 2] = Math.sin(theta) * radius * R;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <points geometry={geom}>
      <pointsMaterial size={0.012} color="#3f6584" transparent opacity={0.85} sizeAttenuation />
    </points>
  );
}

function Arcs() {
  const lines = useMemo(() => {
    const dest = latLonToVec3(MUMBAI.lat, MUMBAI.lon);
    return HUBS.map((h) => {
      const pts = arcPoints(latLonToVec3(h.lat, h.lon), dest);
      const geometry = new THREE.BufferGeometry().setFromPoints(pts);
      const color = h.inflow ? new THREE.Color("#34d399") : new THREE.Color("#fb7185");
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.32 });
      const line = new THREE.Line(geometry, material);
      return { line, pts, color };
    });
  }, []);

  // One glowing particle riding each arc.
  const particlesRef = useRef<THREE.Points>(null);
  const particleGeom = useMemo(() => {
    const positions = new Float32Array(lines.length * 3);
    const colors = new Float32Array(lines.length * 3);
    lines.forEach((l, i) => {
      colors[i * 3] = l.color.r;
      colors[i * 3 + 1] = l.color.g;
      colors[i * 3 + 2] = l.color.b;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [lines]);

  useFrame(({ clock }) => {
    const pts = particlesRef.current;
    if (!pts) return;
    const pos = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const t = clock.getElapsedTime();
    lines.forEach((l, i) => {
      const phase = (t * 0.18 + i / lines.length) % 1;
      const idx = Math.min(l.pts.length - 1, Math.floor(phase * (l.pts.length - 1)));
      const p = l.pts[idx];
      pos.setXYZ(i, p.x, p.y, p.z);
    });
    pos.needsUpdate = true;
  });

  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={i} object={l.line} />
      ))}
      <points ref={particlesRef} geometry={particleGeom}>
        <pointsMaterial size={0.06} vertexColors transparent sizeAttenuation opacity={0.95} />
      </points>
    </group>
  );
}

function Hubs() {
  const dest = useMemo(() => latLonToVec3(MUMBAI.lat, MUMBAI.lon, R * 1.005), []);
  return (
    <group>
      {/* Mumbai — the anchor */}
      <mesh position={dest}>
        <sphereGeometry args={[0.028, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      {HUBS.map((h) => {
        const p = latLonToVec3(h.lat, h.lon, R * 1.005);
        return (
          <mesh key={h.name} position={p}>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshBasicMaterial color={h.inflow ? "#34d399" : "#fb7185"} />
          </mesh>
        );
      })}
    </group>
  );
}

function Scene({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (still || !group.current) return;
    group.current.rotation.y += delta * 0.055;
  });
  return (
    <>
      <ambientLight intensity={0.6} />
      <group ref={group} rotation={[0.32, -1.15, 0]}>
        <DottedGlobe />
        {/* faint inner sphere so the back dots don't bleed through */}
        <mesh>
          <sphereGeometry args={[R * 0.985, 48, 48]} />
          <meshBasicMaterial color="#060b16" />
        </mesh>
        <Arcs />
        <Hubs />
      </group>
      {/* atmosphere */}
      <mesh scale={1.18}>
        <sphereGeometry args={[R, 48, 48]} />
        <meshBasicMaterial color="#1f6feb" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function CssFallback() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400/25 bg-[radial-gradient(circle_at_35%_30%,rgba(56,189,248,0.22),transparent_60%)] shadow-[0_0_120px_-20px_rgba(56,189,248,0.6)]">
        <div className="grid-floor absolute inset-0 rounded-full opacity-60" />
      </div>
    </div>
  );
}

export default function Globe() {
  const [mounted, setMounted] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    setMounted(true);
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  if (!mounted) return <CssFallback />;

  return (
    <Canvas
      camera={{ position: [0, 0, 3.1], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      frameloop={still ? "demand" : "always"}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Scene still={still} />
    </Canvas>
  );
}
