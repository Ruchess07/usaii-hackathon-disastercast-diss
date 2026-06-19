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
  const [showBiggest, setShowBiggest] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getCityEvents(slug, since, until).then(setEvents).finally(() => setLoading(false));
  }, [slug, since, until]);

  const displayEvents = showBiggest
    ? events
    : events.filter((e) => e.total_damage_bn < Math.max(...events.map((x) => x.total_damage_bn)));

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.current.getBoundingClientRect();
    let w = rect.width;
    if (w === 0) {
      w = containerRef.current?.getBoundingClientRect().width ?? 600;
      if (w === 0) w = 600;
    }
    const h = 280;
    canvasRef.current.width = w * dpr;
    canvasRef.current.height = h * dpr;
    canvasRef.current.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const pad = { top: 24, right: 16, bottom: 36, left: 48 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    if (!displayEvents.length) return;

    const years = displayEvents.map((e) => e.year);
    const costs = displayEvents.map((e) => e.total_damage_bn);
    const maxCost = Math.max(...costs) * 1.15;
    const minYear = Math.min(...years) - 1;
    const maxYear = Math.max(...years) + 1;

    if (maxCost <= 0 || maxYear - minYear <= 0) return;

    const xPos = (yr: number) => pad.left + ((yr - minYear) / (maxYear - minYear)) * chartW;

    // Grid helpers for log scale
    const logMin = Math.log10(Math.max(Math.min(...costs) * 0.5, 0.01));
    const logMax = Math.log10(maxCost);

    const yPosLinear = (c: number) => pad.top + chartH - (c / maxCost) * chartH;
    const yPosLog = (c: number) => {
      if (c <= 0) return pad.top + chartH;
      return pad.top + chartH - ((Math.log10(c) - logMin) / (logMax - logMin)) * chartH;
    };
    const yPos = logScale ? yPosLog : yPosLinear;

    // Grid lines
    ctx.strokeStyle = "#F0F0F0";
    ctx.lineWidth = 1;

    if (logScale) {
      const logTicks = [0.1, 1, 10, 100, 1000];
      logTicks.forEach((tick) => {
        if (tick < Math.min(...costs) * 0.5 || tick > maxCost * 1.5) return;
        const y = yPosLog(tick);
        if (y < pad.top || y > pad.top + chartH) return;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(w - pad.right, y);
        ctx.stroke();
        ctx.fillStyle = "#787774";
        ctx.font = "10px Geist Mono, monospace";
        ctx.textAlign = "right";
        ctx.fillText(tick >= 1 ? `$${tick.toFixed(0)}B` : `$${tick.toFixed(1)}B`, pad.left - 8, y + 3);
      });
      ctx.fillStyle = "#956400";
      ctx.font = "9px Geist Sans, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("log scale", pad.left, pad.top - 6);
    } else {
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
    }

    // Trend line — only in linear mode with enough points
    if (!logScale && displayEvents.length >= 2) {
      const n = displayEvents.length;
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

    // Bars — group by year for side-by-side layout
    const yearGroups: Record<number, DisasterEvent[]> = {};
    displayEvents.forEach((e) => {
      if (!yearGroups[e.year]) yearGroups[e.year] = [];
      yearGroups[e.year].push(e);
    });

    const barW = Math.min(48, chartW / displayEvents.length * 0.6);

    Object.entries(yearGroups).forEach(([yrStr, group]) => {
      const yr = Number(yrStr);
      const subW = barW * 0.7 / group.length;
      const offset = (group.length - 1) * subW / 2;
      const baseX = xPos(yr);

      group.forEach((e, i) => {
        const bx = baseX - offset + i * subW;
        const y = yPos(e.total_damage_bn);
        const barH = (pad.top + chartH) - y;

        const gradient = ctx.createLinearGradient(bx, y, bx, pad.top + chartH);
        gradient.addColorStop(0, "#9F2F2D");
        gradient.addColorStop(1, "#FDEBEC");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(bx, y, subW, Math.max(0, barH), [3, 3, 0, 0]);
        ctx.fill();

        ctx.fillStyle = "#1E293B";
        ctx.font = "11px Geist Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`$${e.total_damage_bn.toFixed(1)}B`, bx + subW / 2, y - 6);
      });

      ctx.fillStyle = "#787774";
      ctx.font = "9px Geist Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(yr), baseX, pad.top + chartH + 16);
    });
  }, [displayEvents, logScale]);

  const biggestName = events.length
    ? events.reduce((a, b) => (a.total_damage_bn > b.total_damage_bn ? a : b)).event_name
    : "largest";

  return (
    <div ref={containerRef} className="bg-white border border-[#EAEAEA] rounded-[8px] p-5 relative">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs font-medium text-[#1E293B]">Historic damage costs</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBiggest(!showBiggest)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
              showBiggest
                ? "bg-[#1E293B] text-white"
                : "bg-[#F0EFEA] text-[#787774]"
            }`}
          >
            {showBiggest ? `With ${biggestName}` : "Without largest"}
          </button>
          <button
            onClick={() => setLogScale(!logScale)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
              logScale
                ? "bg-[#1E293B] text-white"
                : "bg-[#F0EFEA] text-[#787774]"
            }`}
          >
            {logScale ? "Log" : "Linear"}
          </button>
        </div>
      </div>
      {loading && events.length === 0 ? (
        <ChartSkeleton />
      ) : (
        <canvas ref={canvasRef} className="w-full" />
      )}
      <p className="text-[10px] text-[#787774] mt-2">Data source: FEMA OpenFEMA</p>
    </div>
  );
}
