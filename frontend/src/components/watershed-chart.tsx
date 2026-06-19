"use client";

import { useEffect, useRef, useState } from "react";
import { getHoustonWatersheds } from "@/lib/api";
import type { Watershed } from "@/lib/api";
import { ChartSkeleton } from "@/components/ui/skeleton";

export function WatershedChart() {
  const [data, setData] = useState<Watershed[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    getHoustonWatersheds().then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 320;
    canvasRef.current.width = w * dpr;
    canvasRef.current.height = h * dpr;
    canvasRef.current.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const sorted = [...data].sort((a, b) => b.value_bn - a.value_bn);
    const maxVal = sorted[0].value_bn * 1.15;
    const barH = 20;
    const gap = 6;
    const labelW = 130;
    const padLeft = 16;
    const padTop = 16;
    const padRight = 80;
    const chartW = w - padLeft - padRight - labelW;

    ctx.clearRect(0, 0, w, h);

    sorted.forEach((ws, i) => {
      const y = padTop + i * (barH + gap);
      const barW = (ws.value_bn / maxVal) * chartW;

      const ratio = ws.value_bn / maxVal;
      let color = "#FDEBEC";
      if (ratio > 0.8) color = "#9F2F2D";
      else if (ratio > 0.5) color = "#E8918E";
      else if (ratio > 0.25) color = "#F5C6C5";

      ctx.fillStyle = "#787774";
      ctx.font = "9px Geist Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText(ws.watershed, padLeft + labelW - 8, y + barH / 2 + 3);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(padLeft + labelW, y, barW, barH, [3, 3, 3, 3]);
      ctx.fill();

      ctx.fillStyle = "#1E293B";
      ctx.font = "9px Geist Sans, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`$${ws.value_bn.toFixed(1)}B`, padLeft + labelW + barW + 6, y + barH / 2 + 3);

      ctx.fillStyle = "#787774";
      ctx.font = "8px Geist Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${ws.major_destroyed} dest.`, padLeft + labelW + barW + 6, y + barH / 2 + 14);
    });

    ctx.fillStyle = "#787774";
    ctx.font = "9px Geist Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Watershed", padLeft + labelW - 8, 10);
    ctx.fillText("Damage ", padLeft + labelW + chartW, 10);
  }, [data]);

  if (loading) return <ChartSkeleton />;
  if (!data.length) return null;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-1">Harvey damage by watershed</p>
      <p className="text-[10px] text-[#787774] mb-3">Property damage value and destruction count per watershed</p>
      <canvas ref={canvasRef} className="w-full" />
      <p className="text-[10px] text-[#787774] mt-2">Data source: FEMA/HCAD Harvey damage assessment</p>
    </div>
  );
}
