"use client";

import { useEffect, useRef } from "react";

interface CityData {
  name: string;
  value: number;
  color: string;
}

interface Props {
  label: string;
  cities: CityData[];
  maxValue?: number;
}

export function ComparisonBarChart({ label, cities, maxValue }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.getBoundingClientRect().width || 400;
    const h = 80;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const max = maxValue || Math.max(...cities.map((c) => c.value)) * 1.2;
    const pad = { top: 8, bottom: 20, left: 8, right: 8 };
    const chartW = w - pad.left - pad.right;
    const barW = chartW / (cities.length * 2 + 1);
    const chartH = h - pad.top - pad.bottom;

    cities.forEach((c, i) => {
      const x = pad.left + barW + i * (barW * 2);
      const barH = (c.value / max) * chartH;
      const y = pad.top + chartH - barH;

      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx.fill();

      ctx.fillStyle = "#1E293B";
      ctx.font = "10px Geist Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(c.name, x + barW / 2, pad.top + chartH + 14);

      ctx.fillStyle = "#787774";
      ctx.font = "9px Geist Mono, monospace";
      ctx.fillText(c.name === cities[0].name ? `$${c.value.toFixed(0)}B` : "", x + barW / 2, y - 4);
    });
  }, [cities, maxValue]);

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-3">{label}</p>
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
}
