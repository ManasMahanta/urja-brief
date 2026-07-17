"use client";

import { useEffect, useRef } from "react";

// A quiet opening-bell chart: its candles sit to the right so the market story
// remains readable on the left, while the page instantly signals "stocks".
const CANDLE_COUNT = 30;

export default function SignalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    let width = 0;
    let height = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const t = now / 1000;
      const left = width * 0.36;
      const chartWidth = width * 0.7;
      const top = height * 0.15;
      const chartHeight = height * 0.67;
      const grid = dark ? "rgba(110, 231, 183, 0.10)" : "rgba(21, 128, 61, 0.11)";
      const up = dark ? "rgba(74, 222, 128, 0.6)" : "rgba(22, 163, 74, 0.5)";
      const down = dark ? "rgba(251, 113, 133, 0.42)" : "rgba(225, 29, 72, 0.34)";

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = grid;
      for (let i = 0; i <= 5; i++) {
        const y = top + (chartHeight * i) / 5;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let i = 0; i <= 7; i++) {
        const x = left + (chartWidth * i) / 7;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + chartHeight);
        ctx.stroke();
      }

      const values: number[] = [];
      for (let i = 0; i <= CANDLE_COUNT; i++) {
        const trend = i * 0.019;
        const wave = Math.sin(i * 0.82) * 0.075 + Math.cos(i * 0.29) * 0.04;
        const pulse = reduceMotion ? 0 : Math.sin(t * 1.2 + i * 0.42) * 0.009;
        values.push(0.37 + trend + wave + pulse);
      }
      const yFor = (value: number) => top + chartHeight * (1 - value);

      // The closing trace is deliberately faint; candles do the visual work.
      ctx.beginPath();
      values.forEach((value, i) => {
        const x = left + (chartWidth * i) / CANDLE_COUNT;
        if (i === 0) ctx.moveTo(x, yFor(value));
        else ctx.lineTo(x, yFor(value));
      });
      ctx.strokeStyle = dark ? "rgba(110, 231, 183, 0.36)" : "rgba(5, 150, 105, 0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const step = chartWidth / CANDLE_COUNT;
      for (let i = 1; i <= CANDLE_COUNT; i++) {
        const open = values[i - 1];
        const close = values[i];
        const high = Math.max(open, close) + 0.024 + (i % 3) * 0.006;
        const low = Math.min(open, close) - 0.021 - (i % 4) * 0.004;
        const x = left + step * i;
        const rising = close >= open;
        const color = rising ? up : down;
        const bodyTop = yFor(Math.max(open, close));
        const bodyBottom = yFor(Math.min(open, close));

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yFor(high));
        ctx.lineTo(x, yFor(low));
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(x - Math.max(2, step * 0.22), bodyTop, Math.max(4, step * 0.44), Math.max(2, bodyBottom - bodyTop));
      }

      const lastX = left + chartWidth;
      const lastY = yFor(values[values.length - 1]);
      ctx.fillStyle = dark ? "rgba(187, 247, 208, 0.9)" : "rgba(21, 128, 61, 0.72)";
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (reduceMotion) draw(0);
    else raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="signal-fade pointer-events-none absolute inset-0 h-full w-full" />;
}
