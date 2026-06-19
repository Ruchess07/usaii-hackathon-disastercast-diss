"use client";

import { useEffect, useState, useRef } from "react";
import { getCityEvents } from "@/lib/api";
import type { DisasterEvent } from "@/types";
import { ChartSkeleton } from "@/components/ui/skeleton";

interface Props {
  slug: string;
  since?: number;
  until?: number;
}

export function HistoricalChart({ slug, since, until }: Props) {
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLoading(true);
    getCityEvents(slug, since, until).then(setEvents).finally(() => setLoading(false));
  }, [slug, since, until]);

  useEffect(() => {
    if (!events.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = 280;
    canvasRef.current.width = w * dpr;
    canvasRef.current.height = h * dpr;
    canvasRef.current.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const pad = { top: 24, right: 16, bottom: 36, left: 48 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const years = events.map((e) => e.year);
    const costs = events.map((e) => e.total_damage_bn);
    const maxCost = Math.max(...costs) * 1.15;
    const minYear = Math.min(...years) - 1;
    const maxYear = Math.max(...years) + 1;

    const xPos = (yr: number) => pad.left + ((yr - minYear) / (maxYear - minYear)) * chartW;
    const yPos = (c: number) => pad.top + chartH - (c / maxCost) * chartH;

    // Grid lines
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

    // Trend line (linear regression)
    if (events.length >= 2) {
      const n = events.length;
      const sumX = years.reduce((a, b) => a + b, 0);
      const sumY = costs.reduce((a, b) => a + b, 0);
      const sumXY = years.reduce((a, y, i) => a + y * costs[i], 0);
      const sumX2 = years.reduce((a, y) => a + y * y, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const trendEnd = Math.max(maxYear, 2030);
      ctx.strokeStyle = "#956400";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(xPos(minYear), yPos(slope * minYear + intercept));
      ctx.lineTo(xPos(trendEnd), yPos(slope * trendEnd + intercept));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#956400";
      ctx.font = "10px Geist Sans, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Trend", xPos(trendEnd) - 20, yPos(slope * trendEnd + intercept) - 6);
    }

    // Bars
    const barW = Math.min(48, chartW / events.length * 0.6);
    events.forEach((e, i) => {
      const x = xPos(e.year) - barW / 2;
      const y = yPos(e.total_damage_bn);
      const barH = chartH - (y - pad.top);

      const gradient = ctx.createLinearGradient(x, y, x, pad.top + chartH);
      gradient.addColorStop(0, "#9F2F2D");
      gradient.addColorStop(1, "#FDEBEC");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx.fill();

      // Label
      ctx.fillStyle = "#1E293B";
      ctx.font = "11px Geist Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`$${e.total_damage_bn.toFixed(0)}B`, x + barW / 2, y - 6);
      ctx.fillStyle = "#787774";
      ctx.font = "9px Geist Mono, monospace";
      ctx.fillText(String(e.year), x + barW / 2, pad.top + chartH + 16);
    });
  }, [events]);

  if (loading) return <ChartSkeleton />;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-3">Historic damage costs</p>
      <canvas ref={canvasRef} className="w-full" />
      <p className="text-[10px] text-[#787774] mt-2">Data source: FEMA OpenFEMA</p>
    </div>
  );
}
