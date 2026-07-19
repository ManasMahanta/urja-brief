"use client";

import { useMemo, useState } from "react";
import fuel from "@/data/fuel-prices.json";

// "Where does your ₹100 of petrol go?" — the transparency breakdown. Base price,
// dealer commission, and central excise are near-uniform nationwide; the pump
// price differences between cities are almost entirely state VAT. So we treat
// base + excise + dealer as fixed and read VAT as the residual, which recovers
// each state's real tax level straight from its pump price.

const CONST = {
  petrol: { base: 55.66, excise: 19.9, dealer: 3.77 },
  diesel: { base: 56.67, excise: 15.8, dealer: 2.58 },
} as const;

const cities = Object.keys(fuel.cities);
const inr = (v: number) => `₹${v.toFixed(2)}`;

type Fuel = "petrol" | "diesel";

const SEGMENTS: Array<{ key: "base" | "dealer" | "excise" | "vat"; label: string; bar: string; tax: boolean }> = [
  { key: "base", label: "Base price (refinery + margin)", bar: "bg-slate-400/80", tax: false },
  { key: "dealer", label: "Dealer commission", bar: "bg-cyan-400/80", tax: false },
  { key: "excise", label: "Central excise", bar: "bg-amber-400/80", tax: true },
  { key: "vat", label: "State VAT", bar: "bg-rose-400/80", tax: true },
];

type Live = { postedOn: string; metros: Record<string, { petrol: number; diesel: number }> };

export default function FuelBreakdown({ live }: { live?: Live }) {
  const [city, setCity] = useState("Delhi");
  const [kind, setKind] = useState<Fuel>("petrol");

  const liveHere = live?.metros[city]?.[kind];

  const data = useMemo(() => {
    const retail = live?.metros[city]?.[kind] ?? (fuel.cities as Record<string, { petrol: number; diesel: number }>)[city][kind];
    const c = CONST[kind];
    const vat = Math.max(0, retail - c.base - c.excise - c.dealer);
    const parts = { base: c.base, dealer: c.dealer, excise: c.excise, vat };
    const tax = c.excise + vat;
    return { retail, parts, tax, taxPct: (tax / retail) * 100 };
  }, [city, kind, live]);

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Where your fuel money goes</p>
        <div className="flex gap-1" role="group" aria-label="Fuel">
          {(["petrol", "diesel"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setKind(f)}
              aria-pressed={kind === f}
              className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition ${kind === f ? "bg-cyan-300 text-slate-950" : "border border-cyan-100/20 text-cyan-200/80 hover:text-white"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 block max-w-xs">
        <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">City</span>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
        >
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <p className="mt-5 text-sm text-slate-300">
        A litre of {kind} in {city} costs <span className="font-mono text-white">{inr(data.retail)}</span> — of which{" "}
        <span className="font-mono font-semibold text-rose-300">{inr(data.tax)} ({data.taxPct.toFixed(0)}%) is tax</span>.
        {liveHere && live ? (
          <span className="ml-2 rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-emerald-300">
            PPAC official · {live.postedOn}
          </span>
        ) : null}
      </p>

      <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-slate-950/60" aria-hidden="true">
        {SEGMENTS.map((s) => (
          <span key={s.key} className={s.bar} style={{ width: `${(data.parts[s.key] / data.retail) * 100}%` }} />
        ))}
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 text-slate-300">
              <span className={`h-2.5 w-2.5 rounded-full ${s.bar}`} aria-hidden="true" />
              {s.label}{s.tax && <span className="text-[0.6rem] uppercase tracking-wide text-rose-300/70">tax</span>}
            </span>
            <span className="font-mono text-slate-100">{inr(data.parts[s.key])}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Central excise (₹{CONST[kind].excise}/L) is uniform nationwide; the base price and dealer
        commission barely vary — so the gap between cities is state VAT. Excise and dealer commission
        are approximate current values; pump prices are reference ({fuel.asOf}). Illustrative, not a bill.
      </p>
    </section>
  );
}
