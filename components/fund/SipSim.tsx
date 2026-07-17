"use client";

// 05 — SIP simulator. Runs entirely on the real NAV series handed down from the
// server, so dragging the controls is instant and costs no upstream calls.

import { useMemo, useState } from "react";
import type { NavPoint } from "@/lib/mf";

const AMOUNTS = [2000, 5000, 10_000, 25_000];
const DAY = 86_400_000;

const inrCompact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return "₹" + Math.round(n).toLocaleString("en-IN");
};

function navAt(s: NavPoint[], t: number): NavPoint | null {
  let lo = 0;
  let hi = s.length - 1;
  let ans: NavPoint | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) {
      ans = s[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

function xirr(flows: { t: number; amt: number }[]): number | null {
  if (flows.length < 2) return null;
  const t0 = flows[0].t;
  const npv = (r: number) => flows.reduce((s, f) => s + f.amt / Math.pow(1 + r, (f.t - t0) / (365 * DAY)), 0);
  let lo = -0.9999;
  let hi = 10;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

export default function SipSim({ nav, maxYears }: { nav: NavPoint[]; maxYears: number }) {
  const years = [1, 3, 5, 10, 15].filter((y) => y <= Math.floor(maxYears));
  const [amount, setAmount] = useState(5000);
  const [span, setSpan] = useState(() => years[years.length - 1] ?? 1);

  const res = useMemo(() => {
    if (!nav.length) return null;
    const end = nav[nav.length - 1];
    const d = new Date(Math.max(Date.UTC(new Date(end.t).getUTCFullYear() - span, new Date(end.t).getUTCMonth(), new Date(end.t).getUTCDate()), nav[0].t));
    let cur = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const flows: { t: number; amt: number }[] = [];
    let units = 0;
    let invested = 0;
    while (cur <= end.t) {
      const p = navAt(nav, cur);
      if (p) {
        units += amount / p.v;
        invested += amount;
        flows.push({ t: cur, amt: -amount });
      }
      const c = new Date(cur);
      cur = Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, c.getUTCDate());
    }
    if (!flows.length) return null;
    const value = units * end.v;
    flows.push({ t: end.t, amt: value });
    return { invested, value, xirr: xirr(flows), months: flows.length - 1 };
  }, [nav, amount, span]);

  const gain = res ? res.value - res.invested : 0;
  const growth = res && res.invested > 0 ? (res.value / res.invested - 1) * 100 : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="glass p-5">
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">Monthly amount</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(a)}
              className={`rounded-full border px-3 py-1.5 font-mono text-xs font-medium transition ${
                amount === a ? "border-violet-400/50 bg-violet-400/10 text-white" : "border-white/10 bg-white/[0.03] text-text-mute hover:text-text-dim"
              }`}
            >
              ₹{a.toLocaleString("en-IN")}
            </button>
          ))}
        </div>

        <p className="mt-5 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-text-mute">For how long</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSpan(y)}
              className={`rounded-full border px-3 py-1.5 font-mono text-xs font-medium transition ${
                span === y ? "border-sky-400/40 bg-sky-400/10 text-white" : "border-white/10 bg-white/[0.03] text-text-mute hover:text-text-dim"
              }`}
            >
              {y}Y
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-text-mute">
          Buys units at the actual published NAV on the same date each month, then
          computes XIRR over the real cash flows. Not a projection — this is what
          the SIP would have done.
        </p>
      </div>

      <div className="glass rail p-5" style={{ ["--rail" as string]: gain >= 0 ? "#34d399" : "#fb7185" }}>
        {!res ? (
          <p className="text-sm text-text-mute">Not enough NAV history for this window.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-mute">
                ₹{amount.toLocaleString("en-IN")}/mo × {res.months} months
              </p>
              {res.xirr !== null && (
                <span className={`tabular rounded border px-2 py-0.5 font-mono text-[0.6rem] font-bold ${res.xirr >= 0 ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-rose-400/25 bg-rose-400/10 text-rose-300"}`}>
                  XIRR {res.xirr.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-text-mute">You invested</span>
                <span className="tabular font-mono text-lg font-semibold text-text-dim">{inrCompact(res.invested)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-text-mute">It became</span>
                <span className="tabular font-mono text-3xl font-bold text-white">{inrCompact(res.value)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
                <span className="text-xs text-white">Gain</span>
                <span className={`tabular font-mono text-lg font-bold ${gain >= 0 ? "text-up" : "text-down"}`}>
                  {gain >= 0 ? "+" : "−"}
                  {inrCompact(Math.abs(gain))}
                  <span className="ml-2 text-xs font-medium opacity-70">
                    {growth >= 0 ? "+" : ""}
                    {growth.toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
