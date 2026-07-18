"use client";

import { useMemo, useState } from "react";
import tariffs from "@/data/tariffs.json";
import type { SolarYield } from "@/lib/solar";

// The PM Surya Ghar question, answered with local sun: pick your city and system
// size, get real generation, savings, and payback. Yield per city is measured
// (a year of open-meteo radiation); the money math runs live in the browser.

const GROSS_COST_PER_KW = 55_000; // ₹, typical installed cost before subsidy
const GRID_CO2_KG_PER_KWH = 0.71; // CEA grid emission factor (avoided per unit)

// PM Surya Ghar central subsidy: ₹30k/kW up to 2 kW, ₹18k for the 3rd, cap ₹78k.
function subsidy(kw: number): number {
  return Math.min(78_000, 30_000 * Math.min(kw, 2) + 18_000 * Math.max(0, Math.min(kw, 3) - 2));
}

const inr = (v: number) =>
  v.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function RooftopCalculator({ yields }: { yields: SolarYield[] }) {
  const [cityName, setCityName] = useState(yields[0]?.name ?? "Delhi");
  const [kw, setKw] = useState(3);

  const result = useMemo(() => {
    const city = yields.find((y) => y.name === cityName) ?? yields[0];
    if (!city) return null;
    const tariff = (tariffs.states as Record<string, number>)[city.state] ?? tariffs.national;
    const annualGen = kw * city.yieldKwhPerKwYear;
    const annualSavings = annualGen * tariff;
    const net = Math.max(0, GROSS_COST_PER_KW * kw - subsidy(kw));
    const payback = annualSavings > 0 ? net / annualSavings : null;
    return {
      city,
      tariff,
      annualGen,
      monthlyGen: annualGen / 12,
      annualSavings,
      co2Tonnes: (annualGen * GRID_CO2_KG_PER_KWH) / 1000,
      subsidy: subsidy(kw),
      net,
      payback,
      lifetime: annualSavings * 25 - net, // 25-yr, nominal
    };
  }, [cityName, kw]);

  if (!result) return null;

  return (
    <section className="urja-panel p-5 sm:p-6">
      <p className="urja-kicker">Rooftop solar calculator</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        What panels would generate and save at your address, using a full year of your city&apos;s
        actual sunlight. Payback includes the PM Surya Ghar subsidy.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">Your city</span>
          <select
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-cyan-100/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
          >
            {yields.map((y) => <option key={y.name} value={y.name}>{y.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
            System size — {kw} kW (≈ {Math.round(kw * 7)} m² roof)
          </span>
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={kw}
            onChange={(e) => setKw(Number(e.target.value))}
            className="mt-3 w-full accent-cyan-300"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-cyan-100/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">Generation</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-white">{Math.round(result.monthlyGen).toLocaleString("en-IN")}<span className="ml-1 text-sm font-normal text-slate-400">kWh/mo</span></p>
          <p className="mt-1 text-xs text-slate-500">{Math.round(result.annualGen).toLocaleString("en-IN")} kWh/yr</p>
        </div>
        <div className="rounded-xl border border-cyan-100/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">Bill savings (~₹{result.tariff}/unit)</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-cyan-200">{inr(result.annualSavings)}<span className="ml-1 text-sm font-normal text-slate-400">/yr</span></p>
        </div>
        <div className="rounded-xl border border-cyan-100/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">Payback</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-300">{result.payback ? `${result.payback.toFixed(1)} yr` : "—"}</p>
          <p className="mt-1 text-xs text-slate-500">after {inr(result.subsidy)} subsidy</p>
        </div>
        <div className="rounded-xl border border-cyan-100/10 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-400">CO<sub>2</sub> avoided</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-300">{result.co2Tonnes.toFixed(1)}<span className="ml-1 text-sm font-normal text-slate-400">t/yr</span></p>
        </div>
      </div>

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        Net cost ~{inr(result.net)} after subsidy (at ~₹{GROSS_COST_PER_KW.toLocaleString("en-IN")}/kW installed);
        rough 25-year saving ~{inr(result.lifetime)}. Yield is {result.city.yieldKwhPerKwYear.toLocaleString("en-IN")} kWh
        per kW per year for {result.city.name}, from a year of measured radiation at 75% performance ratio. An
        estimate — actual output depends on shading, roof tilt, and your net-metering terms.
      </p>
    </section>
  );
}
