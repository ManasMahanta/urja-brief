"use client";

import dynamic from "next/dynamic";

// The map is WebGL + external tiles, so it loads client-side after hydration.
const MapLibreMap = dynamic(() => import("@/components/ev/MapLibreMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[26rem] w-full items-center justify-center rounded-xl border border-cyan-100/10 bg-[#05070d] sm:h-[34rem]">
      <p className="font-mono text-xs uppercase tracking-wide text-slate-500">Loading the map…</p>
    </div>
  ),
});

export default function EvMapLoader(props: {
  stations: Array<{
    name: string;
    city?: string;
    state?: string;
    lat: number;
    lng: number;
    source: string;
    pricing?: string;
  }>;
}) {
  return <MapLibreMap {...props} />;
}
