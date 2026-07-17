"use client";

// A live "market pulse" — an oscilloscope EKG line whose amplitude reflects a
// breadth/volatility reading. Pure canvas, GPU-cheap, honours reduced-motion.

import { useEffect, useRef } from "react";

export default function MarketPulse({
  intensity = 0.6,
  positive = true,
  label = "Market pulse",
  reading = "Risk-on",
}: {
  intensity?: number;
  positive?: boolean;
  label?: string;
  reading?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const color = positive ? "#34d399" : "#fb7185";
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // A repeating heartbeat waveform sampled across the width.
    const beat = (x: number, t: number) => {
      const p = ((x / w) * 4 + t * 0.6) % 1;
      let y = Math.sin(p * Math.PI * 2) * 0.12;
      // spike
      const d = Math.abs(p - 0.5);
      if (d < 0.06) y += (0.06 - d) * 8 * (p < 0.5 ? 1 : -1) * intensity;
      return y;
    };

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      // baseline grid
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = h / 2 - beat(x, reduce ? 0 : t) * h;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (reduce) draw(0);
    else raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [intensity, positive]);

  return (
    <div className="glass flex items-center gap-4 p-4">
      <div className="min-w-0">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-text-mute">{label}</p>
        <p className={`mt-1 text-sm font-semibold ${positive ? "text-up" : "text-down"}`}>{reading}</p>
      </div>
      <canvas ref={ref} aria-hidden="true" className="h-10 flex-1" />
    </div>
  );
}
