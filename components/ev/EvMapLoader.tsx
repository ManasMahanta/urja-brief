"use client";

import dynamic from "next/dynamic";
import type { StateShape } from "@/lib/ev";

// The 3D canvas is WebGL-only, so it loads client-side after hydration.
const IndiaMap3D = dynamic(() => import("@/components/ev/IndiaMap3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[26rem] w-full items-center justify-center rounded-xl border border-cyan-100/10 bg-[#05070d] sm:h-[30rem]">
      <p className="font-mono text-xs uppercase tracking-wide text-slate-500">
        Loading the 3D map…
      </p>
    </div>
  ),
});

export default function EvMapLoader(props: {
  states: StateShape[];
  stations: Array<{
    name: string;
    city?: string;
    state?: string;
    lat: number;
    lng: number;
    source: string;
    pricing?: string;
  }>;
  countsByState: Record<string, number>;
}) {
  return <IndiaMap3D {...props} />;
}
