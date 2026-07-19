"use client";

import dynamic from "next/dynamic";
import type { CoalMapProps } from "./CoalMap";

// WebGL + external tiles, so it mounts client-side after hydration — same
// approach as the EV map.
const CoalMap = dynamic(() => import("./CoalMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[26rem] w-full items-center justify-center rounded-xl border border-cyan-100/10 bg-[#05070d] sm:h-[34rem]">
      <p className="font-mono text-xs uppercase tracking-wide text-slate-500">Loading the map…</p>
    </div>
  ),
});

export default function CoalMapLoader(props: CoalMapProps) {
  return <CoalMap {...props} />;
}
