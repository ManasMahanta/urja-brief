"use client";

// Fund selection for /fund/compare. Selection lives in the URL so a comparison
// is shareable and survives a reload.

import { useRouter, useSearchParams } from "next/navigation";
import FundSearch, { type Hit } from "@/components/fund/FundSearch";
import { MAX_COMPARE_FUNDS as MAX_FUNDS } from "@/lib/mf-config";

export default function ComparePicker({ chosen }: { chosen: { code: number; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const setCodes = (codes: number[]) => {
    const p = new URLSearchParams(params.toString());
    p.delete("f");
    for (const c of codes) p.append("f", String(c));
    router.replace(codes.length ? `/fund/compare?${p}` : "/fund/compare");
  };

  const codes = chosen.map((c) => c.code);
  const add = (h: Hit) => {
    if (codes.includes(h.code) || codes.length >= MAX_FUNDS) return;
    setCodes([...codes, h.code]);
  };

  return (
    <div>
      {chosen.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chosen.map((c) => (
            <span key={c.code} className="glass flex items-center gap-2 px-3 py-1.5">
              <span className="text-xs text-white">{c.name}</span>
              <button
                onClick={() => setCodes(codes.filter((x) => x !== c.code))}
                aria-label={`Remove ${c.name}`}
                className="text-text-mute transition hover:text-rose-300"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {chosen.length < MAX_FUNDS ? (
        <FundSearch
          onPick={add}
          clearOnPick
          placeholder={chosen.length === 0 ? "Add a fund to compare — try “parag parikh flexi”" : "Add another fund…"}
        />
      ) : (
        <p className="text-xs text-text-mute">Four funds is the maximum — remove one to swap it out.</p>
      )}
    </div>
  );
}
