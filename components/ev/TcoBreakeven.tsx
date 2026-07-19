"use client";

import { useMemo, useState } from "react";
import fuel from "@/data/fuel-prices.json";
import tariffs from "@/data/tariffs.json";

// The question RunningCost stops short of: an EV costs more to buy — how long
// until the fuel saving pays that premium back? Same city-price + state-tariff
// engine, extended by one input (the sticker-price gap) into a breakeven.

const CITY_STATE: Record<string, string> = {
  Mumbai: "Maharashtra", Delhi: "Delhi", Bengaluru: "Karnataka", Chennai: "Tamil Nadu",
  Kolkata: "West Bengal", Hyderabad: "Telangana", Pune: "Maharashtra", Ahmedabad: "Gujarat",
  Jaipur: "Rajasthan", Lucknow: "Uttar Pradesh", Chandigarh: "Punjab", Kochi: "Kerala",
};

// Same real-world efficiencies as the running-cost tool, so the two agree.
const SPECS = {
  "2W": { label: "Scooter", petrolEff: 45, evEff: 25, defaultPremium: 40000 },
  "4W": { label: "Car", petrolEff: 16, evEff: 6.5, defaultPremium: 400000 },
} as const;

type Kind = keyof typeof SPECS;

const cities = Object.keys(fuel.cities);
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export default function TcoBreakeven() {
  const [city, setCity] = useState("Pune");
  const [kind, setKind] = useState<Kind>("4W");
  const [km, setKm] = useState(1000);
  const [premium, setPremium] = useState<number>(SPECS["4W"].defaultPremium);

  const setKindAndPremium = (k: Kind) => {
    setKind(k);
    setPremium(SPECS[k].defaultPremium);
  };

  const result = useMemo(() => {
    const spec = SPECS[kind];
    const petrolPrice = (fuel.cities as Record<string, { petrol: number }>)[city].petrol;
    const tariff = (tariffs.states as Record<string, number>)[CITY_STATE[city]] ?? tariffs.national;
    const petrolPerKm = petrolPrice / spec.petrolEff;
    const evPerKm = tariff / spec.evEff;
    const savePerKm = petrolPerKm - evPerKm;
    const savePerMonth = savePerKm * km;
    const months = savePerMonth > 0 ? premium / savePerMonth : Infinity;
    const breakevenKm = savePerKm > 0 ? premium / savePerKm : Infinity;
    return { petrolPerKm, evPerKm, savePerKm, savePerMonth, months, breakevenKm, tariff };
  }, [city, kind, km, premium]);

  const pays = Number.isFinite(result.months);
  const years = Math.floor(result.months / 12);
  const remMonths = Math.round(result.months - years * 12);

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">When does the EV pay off?</p>
        <div className="flex gap-1" role="group" aria-label="Vehicle">
          {(Object.keys(SPECS) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindAndPremium(k)}
              aria-pressed={kind === k}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition ${kind === k ? "bg-cyan-300 text-slate-950" : "border border-cyan-100/20 text-cyan-200/80 hover:text-white"}`}
            >
              {SPECS[k].label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        An EV saves on fuel but costs more upfront. Enter the price gap and your driving to see how
        long the fuel saving takes to cover it.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Km / month</span>
          <input
            type="number"
            min={0}
            step={100}
            value={km}
            onChange={(e) => setKm(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">EV price premium (₹)</span>
          <input
            type="number"
            min={0}
            step={5000}
            value={premium}
            onChange={(e) => setPremium(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          />
        </label>
      </div>

      <div className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-5">
        {pays ? (
          <>
            <p className="text-sm text-slate-300">
              At {km.toLocaleString("en-IN")} km/month in {city}, the {SPECS[kind].label.toLowerCase()} pays
              back its {inr(premium)} premium in
            </p>
            <p className="mt-2 font-mono text-4xl font-semibold text-emerald-300">
              {years > 0 ? `${years} yr ${remMonths} mo` : `${remMonths} months`}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              ≈ {inr(result.breakevenKm)} km driven · saving {inr(result.savePerMonth)}/month on fuel
              ({inr(result.savePerKm)}/km cheaper than petrol). After that, the saving is pure gain.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-2xl font-semibold text-amber-300">No fuel-cost payback</p>
            <p className="mt-2 text-xs text-slate-400">
              At {city}&apos;s power tariff (₹{result.tariff}/kWh) the EV isn&apos;t cheaper per km here,
              so the premium never pays back on fuel alone. Home solar or a lower tariff changes this.
            </p>
          </>
        )}
      </div>

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Fuel-cost payback only — it ignores battery replacement, servicing (lower on EVs), resale, and
        any state purchase subsidy (which shortens payback). Assumes home charging at the state&apos;s
        domestic tariff and typical efficiency ({SPECS[kind].label.toLowerCase()}: petrol {SPECS[kind].petrolEff} km/l,
        EV {SPECS[kind].evEff} km/kWh). Prices and tariffs are reference values ({fuel.asOf}).
      </p>
    </section>
  );
}
