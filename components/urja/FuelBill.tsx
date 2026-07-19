"use client";

import { useMemo, useState } from "react";
import fuel from "@/data/fuel-prices.json";
import PlainEnglish from "@/components/urja/PlainEnglish";

// Turns the per-city pump prices into a personal monthly bill and, more usefully,
// shows how much of that bill is tax — which varies almost entirely by state VAT.
// Same residual-VAT model as FuelBreakdown: base + excise + dealer are ~uniform
// nationwide, so a city's pump price minus those recovers its real tax level.

const CONST = {
  petrol: { base: 55.66, excise: 19.9, dealer: 3.77 },
  diesel: { base: 56.67, excise: 15.8, dealer: 2.58 },
} as const;

type Fuel = "petrol" | "diesel";
type Row = { petrol: number; diesel: number };

const cityRows = fuel.cities as Record<string, Row>;
const cities = Object.keys(cityRows);
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

type Live = { postedOn: string; metros: Record<string, { petrol: number; diesel: number }> };

const taxPerLitre = (city: string, kind: Fuel, live?: Live) => {
  const c = CONST[kind];
  const retail = live?.metros[city]?.[kind] ?? cityRows[city][kind];
  const vat = Math.max(0, retail - c.base - c.excise - c.dealer);
  return { retail, tax: c.excise + vat, vat };
};

export default function FuelBill({ live }: { live?: Live }) {
  const [city, setCity] = useState("Delhi");
  const [kind, setKind] = useState<Fuel>("petrol");
  const [km, setKm] = useState(1000);
  const [mileage, setMileage] = useState(15);

  const bill = useMemo(() => {
    const { retail, tax } = taxPerLitre(city, kind, live);
    const litres = mileage > 0 ? km / mileage : 0;
    const monthly = litres * retail;
    const taxPart = litres * tax;
    return { litres, monthly, taxPart, yearTax: taxPart * 12, taxPct: retail > 0 ? (tax / retail) * 100 : 0 };
  }, [city, kind, km, mileage, live]);

  // Cheapest → costliest state for a full tank, ranked by pump price for the
  // selected fuel. The spread is almost entirely state VAT.
  const ranking = useMemo(() => {
    const rows = cities.map((c) => ({ city: c, ...taxPerLitre(c, kind, live) }));
    rows.sort((a, b) => a.retail - b.retail);
    const min = rows[0].retail;
    const max = rows[rows.length - 1].retail;
    return { rows, min, max, spread: max - min };
  }, [kind, live]);

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Your monthly fuel bill — and its tax</p>
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

      <PlainEnglish>
        Tell it your city, how far you drive, and your vehicle&apos;s mileage, and it works out your
        monthly fuel spend — and how much of that is just tax.
      </PlainEnglish>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">City</span>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          >
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Km driven / month</span>
          <input
            type="number"
            min={0}
            value={km}
            onChange={(e) => setKm(Math.max(0, Number(e.target.value)))}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Mileage (km/L)</span>
          <input
            type="number"
            min={1}
            value={mileage}
            onChange={(e) => setMileage(Math.max(1, Number(e.target.value)))}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">Fuel every month</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-white">{inr(bill.monthly)}</p>
          <p className="mt-1 text-xs text-slate-500">≈ {bill.litres.toFixed(0)} L of {kind}</p>
        </div>
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4">
          <p className="text-xs text-slate-400">Of that, tax</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-rose-300">{inr(bill.taxPart)}</p>
          <p className="mt-1 text-xs text-slate-500">{bill.taxPct.toFixed(0)}% of every rupee spent</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">Tax you pay in a year</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-white">{inr(bill.yearTax)}</p>
          <p className="mt-1 text-xs text-slate-500">at this driving, in {city}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-cyan-100/10 pt-4">
        <p className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
          Cheapest → costliest city for {kind} · spread ₹{ranking.spread.toFixed(1)}/L, almost all state VAT
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          {ranking.rows.map((r) => {
            const frac = ranking.spread > 0 ? (r.retail - ranking.min) / ranking.spread : 0;
            return (
              <div key={r.city} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 truncate text-slate-300">{r.city}</span>
                <span className="relative h-4 flex-1 overflow-hidden rounded bg-slate-950/60">
                  <span
                    className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-cyan-400/60 to-rose-400/70"
                    style={{ width: `${20 + frac * 80}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-slate-100">₹{r.retail.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Tax per litre is central excise (₹{CONST[kind].excise}/L, uniform nationwide) plus each city&apos;s
        state VAT, read as the residual from its pump price. Prices are reference values ({fuel.asOf}),
        not a live per-station feed — treat the bill as illustrative.
      </p>
    </section>
  );
}
