"use client";

import { useMemo, useState } from "react";
import fuel from "@/data/fuel-prices.json";
import tariffs from "@/data/tariffs.json";

// The question every EV buyer actually asks and no station-finder answers:
// what does a kilometre cost on petrol vs on electricity? Needs no paid fuel
// feed — city pump price (reference) + the state's domestic tariff is enough
// to put ₹/km side by side.

// km per litre (petrol/diesel) or km per kWh (electric), real-world.
const VEHICLES: Array<{ name: string; fuel: "petrol" | "diesel" | "electric"; eff: number; kind: "2W" | "4W" }> = [
  { name: "Petrol scooter", fuel: "petrol", eff: 45, kind: "2W" },
  { name: "Electric scooter", fuel: "electric", eff: 25, kind: "2W" },
  { name: "Petrol car", fuel: "petrol", eff: 16, kind: "4W" },
  { name: "Diesel car", fuel: "diesel", eff: 20, kind: "4W" },
  { name: "Electric car", fuel: "electric", eff: 6.5, kind: "4W" },
];

const CITY_STATE: Record<string, string> = {
  Mumbai: "Maharashtra", Delhi: "Delhi", Bengaluru: "Karnataka", Chennai: "Tamil Nadu",
  Kolkata: "West Bengal", Hyderabad: "Telangana", Pune: "Maharashtra", Ahmedabad: "Gujarat",
  Jaipur: "Rajasthan", Lucknow: "Uttar Pradesh", Chandigarh: "Punjab", Kochi: "Kerala",
};

const cities = Object.keys(fuel.cities);
const inr = (v: number) => v.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: v < 100 ? 2 : 0 });

export default function RunningCost() {
  const [city, setCity] = useState("Pune");
  const [kmPerMonth, setKmPerMonth] = useState(1000);

  const rows = useMemo(() => {
    const prices = (fuel.cities as Record<string, { petrol: number; diesel: number }>)[city];
    const tariff = (tariffs.states as Record<string, number>)[CITY_STATE[city]] ?? tariffs.national;
    return VEHICLES.map((v) => {
      const unitPrice = v.fuel === "electric" ? tariff : prices[v.fuel];
      const perKm = unitPrice / v.eff;
      return { ...v, perKm, perMonth: perKm * kmPerMonth };
    });
  }, [city, kmPerMonth]);

  const petrolCar = rows.find((r) => r.name === "Petrol car")!;
  const evCar = rows.find((r) => r.name === "Electric car")!;
  const carSaving = petrolCar.perMonth - evCar.perMonth;
  const maxPerKm = Math.max(...rows.map((r) => r.perKm));

  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Petrol vs electric — what a kilometre costs</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        A charger is only half the decision; running cost is the other half. This compares fuel and
        electricity at your city&apos;s prices — the comparison a station map can&apos;t make.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Kilometres per month</span>
          <input
            type="number"
            min={0}
            step={100}
            value={kmPerMonth}
            onChange={(e) => setKmPerMonth(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          />
        </label>
      </div>

      <div className="mt-5 space-y-2.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-slate-300">{r.name}</span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-950/60">
              <span
                className={`absolute inset-y-0 left-0 rounded-md ${r.fuel === "electric" ? "bg-emerald-400/30" : "bg-amber-400/25"}`}
                style={{ width: `${Math.max(6, (r.perKm / maxPerKm) * 100)}%` }}
                aria-hidden="true"
              />
              <span className="absolute inset-y-0 left-2.5 flex items-center font-mono text-xs text-slate-100">
                {inr(r.perKm)}/km
              </span>
            </div>
            <span className="w-24 shrink-0 text-right font-mono text-xs text-slate-400">{inr(r.perMonth)}/mo</span>
          </div>
        ))}
      </div>

      {carSaving > 0 && (
        <p className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm leading-relaxed text-emerald-100/90">
          At {kmPerMonth.toLocaleString("en-IN")} km/month in {city}, an electric car runs about{" "}
          <span className="font-mono font-semibold text-emerald-200">{inr(carSaving)}/month</span>{" "}
          cheaper to fuel than a petrol car — roughly{" "}
          <span className="font-mono font-semibold text-emerald-200">{inr(carSaving * 12)}/year</span>.
        </p>
      )}

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Fuel is running cost only — not the higher upfront price of an EV, battery replacement, or
        public fast-charging (dearer than home power). Assumes home charging and typical real-world
        efficiency (petrol car 16 km/l, EV car 6.5 km/kWh). Pump prices are reference values, {fuel.asOf}.
      </p>
    </section>
  );
}
