"use client";

import { useMemo, useState } from "react";

type Plant = { name: string; mw: number; owner?: string | null; year?: number | null };

export default function CoalDirectory({
  plants,
  placeholder = "Search plant or owner — e.g. Mundra, NTPC, Korba",
  noun = "plants",
}: {
  plants: Plant[];
  placeholder?: string;
  noun?: string;
}) {
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return plants;
    return plants.filter(
      (p) => p.name.toLowerCase().includes(needle) || (p.owner ?? "").toLowerCase().includes(needle),
    );
  }, [q, plants]);

  const limit = showAll || q ? filtered.length : 25;
  const shown = filtered.slice(0, limit);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full max-w-sm rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
        />
        <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
          {q ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}` : `${plants.length} ${noun}`}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-cyan-100/10 text-left font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3 font-normal">#</th>
              <th className="py-2 pr-3 font-normal">Plant</th>
              <th className="py-2 pr-3 text-right font-normal">Capacity</th>
              <th className="py-2 font-normal">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-100/10">
            {shown.map((p, i) => (
              <tr key={`${p.name}-${i}`}>
                <td className="py-2 pr-3 font-mono text-slate-500">{plants.indexOf(p) + 1}</td>
                <td className="py-2 pr-3 font-medium text-slate-200">{p.name}</td>
                <td className="py-2 pr-3 text-right font-mono text-amber-200">{p.mw.toLocaleString("en-IN")} MW</td>
                <td className="py-2 text-slate-400">{p.owner || "—"}{p.year ? ` · ${p.year}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shown.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No plant or owner matches &ldquo;{q}&rdquo;.</p>
      )}

      {!q && !showAll && filtered.length > limit && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 text-sm font-semibold text-cyan-300 hover:text-white"
        >
          Show all {plants.length} {noun} →
        </button>
      )}
    </div>
  );
}
