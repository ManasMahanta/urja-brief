"use client";

import dynamic from "next/dynamic";
import type { InfraMapProps } from "./InfraMap";

// WebGL + external tiles, so it mounts client-side after hydration.
const InfraMap = dynamic(() => import("./InfraMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[26rem] w-full items-center justify-center rounded-xl border border-cyan-100/10 bg-[#05070d] sm:h-[34rem]">
      <p className="font-mono text-xs uppercase tracking-wide text-slate-500">Loading the map…</p>
    </div>
  ),
});

export default function InfraMapLoader(props: InfraMapProps) {
  return <InfraMap {...props} />;
}
