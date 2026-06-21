"use client";

import { useEffect, useState, useRef } from "react";
import { getCityCompounding } from "@/lib/api";
import type { CompoundingEvent } from "@/types";
import { ChartSkeleton } from "@/components/ui/skeleton";

interface Props {
  slug: string;
  since?: number;
  until?: number;
}

export function CompoundingChart({ slug, since, until }: Props) {
  const [data, setData] = useState<CompoundingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLoading(true);
    getCityCompounding(slug, 4, since, until).then(setData).finally(() => setLoading(false));
  }, [slug, since, until]);

  useEffect(() => {
    if (!data.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = 260;
    canvasRef.current.width = w * dpr;
    canvasRef.current.height = h * dpr;
    canvasRef.current.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const pad = { top: 24, right: 16, bottom: 36, left: 48 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const costs = data.map((d) => d.total_cost_bn);
    const maxCost = Math.max(...costs) * 1.15;

    const barW = Math.min(64, chartW / data.length * 0.5);
    const colors = ["#FBF3DB", "#FDEBEC", "#9F2F2D", "#6B1D1B"];
    const colorsBar = ["#956400", "#9F2F2D", "#6B1D1B", "#3D0F0E"];

    // Grid
    ctx.strokeStyle = "#F0F0F0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = "#787774";
      ctx.font = "10px Geist Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText(`$${((maxCost / 4) * (4 - i)).toFixed(0)}B`, pad.left - 8, y + 3);
    }

    // Bars
    const totalGap = chartW - data.length * barW;
    const gap = totalGap / (data.length + 1);

    data.forEach((d, i) => {
      const x = pad.left + gap + i * (barW + gap);
      const y = pad.top + chartH - (d.total_cost_bn / maxCost) * chartH;
      const barH = chartH - (y - pad.top);

      // Background bar (full height)
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.roundRect(x, pad.top, barW, chartH, [4, 4, 4, 4]);
      ctx.fill();
      ctx.save();

      // Clip to draw filled portion
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, i === data.length - 1 ? 4 : 0, i === data.length - 1 ? 4 : 0]);
      ctx.clip();

      ctx.fillStyle = colorsBar[i % colorsBar.length];
      ctx.beginPath();
      ctx.roundRect(x, pad.top, barW, chartH, [4, 4, 4, 4]);
      ctx.fill();
      ctx.restore();

      // Value label
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 12px Geist Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`$${d.total_cost_bn.toFixed(0)}B`, x + barW / 2, y + 16);

      // Year label
      ctx.fillStyle = "#787774";
      ctx.font = "9px Geist Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(d.event_number, x + barW / 2, pad.top + chartH + 16);
    });
  }, [data]);

  if (loading) return <ChartSkeleton />;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-1">
        Compounding cost of inaction, next 4 events
      </p>
      <p className="text-[11px] text-[#787774] mb-3 leading-relaxed">
        If this city's current escalation rate continues with no new prevention spending,
        this is the projected cost of each future disaster, four events from now, decades
        apart. Projections are capped at 5 times the worst real historical event for this
        city, since unconstrained compounding produces implausible figures past that point.
      </p>
      <canvas ref={canvasRef} className="w-full" />
      <p className="text-[10px] text-[#787774] mt-2">
        Based on observed cost escalation. Sources: FEMA OpenFEMA, Rice Kinder Institute
      </p>
    </div>
  );
}
