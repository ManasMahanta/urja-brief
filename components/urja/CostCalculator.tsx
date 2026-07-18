"use client";

import { useMemo, useState } from "react";
import tariffs from "@/data/tariffs.json";

// Turns the abstract live carbon number into a personal one: pick an appliance
// and your state, and see what an hour of it costs in rupees AND in kilograms
// of CO2 at the grid's CURRENT intensity (passed in from the server). No
// official dashboard personalises the grid like this — that's the differentiator.

const APPLIANCES: Array<{ name: string; kw: number }> = [
  { name: "Air conditioner (1.5 ton)", kw: 1.5 },
  { name: "Water heater / geyser", kw: 2.0 },
  { name: "Electric car — home charge", kw: 3.3 },
  { name: "Electric scooter — charge", kw: 0.65 },
  { name: "Washing machine", kw: 0.5 },
  { name: "Microwave oven", kw: 1.2 },
  { name: "Water pump (1 HP)", kw: 0.75 },
  { name: "Refrigerator", kw: 0.15 },
  { name: "Ceiling fan", kw: 0.075 },
];

const stateNames = Object.keys(tariffs.states).sort();

const inr = (value: number) =>
  value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: value < 10 ? 2 : 0 });

export default function CostCalculator({ intensityGco2 }: { intensityGco2: number }) {
  const [appliance, setAppliance] = useState(APPLIANCES[0].name);
  const [state, setState] = useState("Maharashtra");
  const [hours, setHours] = useState(2);

  const result = useMemo(() => {
    const kw = APPLIANCES.find((a) => a.name === appliance)?.kw ?? 1;
    const rate = (tariffs.states as Record<string, number>)[state] ?? tariffs.national;
    const kwh = kw * hours;
    return {
      kwh,
      cost: kwh * rate,
      co2Kg: (kwh * intensityGco2) / 1000,
      rate,
    };
  }, [appliance, state, hours, intensityGco2]);

  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">What it costs you — right now</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        The grid&apos;s live carbon intensity, made personal. Costs use an approximate domestic
        tariff for your state; the CO<sub>2</sub> uses the intensity on the grid at this moment
        (<span className="font-mono text-slate-300">{Math.round(intensityGco2)} g/kWh</span>).
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Appliance</span>
          <select
            value={appliance}
            onChange={(e) => setAppliance(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          >
            {APPLIANCES.map((a) => (
              <option key={a.name} value={a.name}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Your state</span>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          >
            {stateNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Hours of use</span>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-cyan-100/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">Electricity used</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-white">{result.kwh.toFixed(2)}<span className="ml-1 text-sm font-normal text-slate-400">kWh</span></p>
        </div>
        <div className="rounded-xl border border-cyan-100/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">Cost (~₹{result.rate}/unit)</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-cyan-200">{inr(result.cost)}</p>
        </div>
        <div className="rounded-xl border border-cyan-100/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">CO<sub>2</sub> at this hour</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-300">{result.co2Kg.toFixed(2)}<span className="ml-1 text-sm font-normal text-slate-400">kg</span></p>
        </div>
      </div>

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Tariffs are approximate domestic slab averages ({tariffs.asOf}) — your real rate depends on
        your DISCOM and monthly units. The CO<sub>2</sub> figure moves through the day: the same
        appliance run in a clean midday hour emits far less than in the coal-heavy evening peak.
      </p>
    </section>
  );
}
