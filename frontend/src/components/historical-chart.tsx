"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  const [animIndex, setAnimIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getCityEvents(slug, since, until).then(setEvents).finally(() => setLoading(false));
  }, [slug, since, until]);

  const displayEvents = showBiggest
    ? events
    : events.filter((e) => e.total_damage_bn < Math.max(...events.map((x) => x.total_damage_bn)));

  const visibleEvents = animIndex !== null
    ? displayEvents.slice(0, animIndex)
    : displayEvents;

  const totalRef = useRef(displayEvents.length);
  totalRef.current = displayEvents.length;

  useEffect(() => {
    setAnimIndex(null);
    setIsPlaying(false);
  }, [events]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setAnimIndex((prev) => {
        const total = totalRef.current;
        if (total === 0) return null;
        if (prev === null || prev < 1) return 1;
        if (prev >= total) { setIsPlaying(false); return total; }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(id);
  }, [isPlaying]);

  const stepForward = useCallback(() => {
    setAnimIndex((prev) => {
      const total = displayEvents.length;
      if (prev === null) return 1;
      return Math.min(prev + 1, total);
    });
  }, [displayEvents.length]);

  const stepBack = useCallback(() => {
    setAnimIndex((prev) => {
      if (prev === null || prev <= 1) return null;
      return prev - 1;
    });
  }, []);

  const resetAnim = useCallback(() => {
    setAnimIndex(null);
    setIsPlaying(false);
  }, []);

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

    if (!visibleEvents.length) return;

    const years = visibleEvents.map((e) => e.year);
    const costs = visibleEvents.map((e) => e.total_damage_bn);
    const maxCost = Math.max(...costs) * 1.15;
    const minYear = Math.min(...years) - 1;
    const maxYear = Math.max(...displayEvents.map((e) => e.year)) + 1;

    if (maxCost <= 0 || maxYear - minYear <= 0) return;

    const xPos = (yr: number) => pad.left + ((yr - minYear) / (maxYear - minYear)) * chartW;

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

    // Trend line
    if (!logScale && visibleEvents.length >= 2) {
      const n = visibleEvents.length;
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
    const yearGroups: Record<number, DisasterEvent[]> = {};
    visibleEvents.forEach((e) => {
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

        const allEventsThisYear = displayEvents.filter((de) => de.year === yr);
        const allSubW = barW * 0.7 / allEventsThisYear.length;
        const allOffset = (allEventsThisYear.length - 1) * allSubW / 2;
        const allBaseX = xPos(yr);
        const actualIdx = allEventsThisYear.findIndex((ae) => ae.event_id === e.event_id);
        const actualBx = allBaseX - allOffset + actualIdx * allSubW;

        const gradient = ctx.createLinearGradient(actualBx, y, actualBx, pad.top + chartH);
        gradient.addColorStop(0, "#9F2F2D");
        gradient.addColorStop(1, "#FDEBEC");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(actualBx, y, allSubW, Math.max(0, barH), [3, 3, 0, 0]);
        ctx.fill();

        ctx.fillStyle = "#1E293B";
        ctx.font = "11px Geist Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`$${e.total_damage_bn.toFixed(1)}B`, actualBx + allSubW / 2, y - 6);
      });

      ctx.fillStyle = "#787774";
      ctx.font = "9px Geist Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(yr), baseX, pad.top + chartH + 16);
    });
  }, [visibleEvents, displayEvents, logScale]);

  const biggestName = events.length
    ? events.reduce((a, b) => (a.total_damage_bn > b.total_damage_bn ? a : b)).event_name
    : "largest";

  const totalCount = displayEvents.length;
  const currentStep = animIndex ?? totalCount;

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
        <div>
          <canvas ref={canvasRef} className="w-full" />
          {displayEvents.length >= 2 && (
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={resetAnim}
                  className="text-[9px] px-2 py-1 rounded bg-[#F0EFEA] text-[#787774] hover:bg-[#E5E4DF] transition-colors"
                  title="Reset"
                >
                  ⏮
                </button>
                <button
                  onClick={stepBack}
                  disabled={currentStep <= 1}
                  className="text-[9px] px-2 py-1 rounded bg-[#F0EFEA] text-[#787774] hover:bg-[#E5E4DF] disabled:opacity-30 transition-colors"
                  title="Step back"
                >
                  ◀
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`text-[9px] px-3 py-1 rounded font-medium transition-colors ${
                    isPlaying
                      ? "bg-[#1E293B] text-white"
                      : "bg-[#F0EFEA] text-[#787774] hover:bg-[#E5E4DF]"
                  }`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? "⏸ Pause" : "▶ Play"}
                </button>
                <button
                  onClick={stepForward}
                  disabled={currentStep >= totalCount}
                  className="text-[9px] px-2 py-1 rounded bg-[#F0EFEA] text-[#787774] hover:bg-[#E5E4DF] disabled:opacity-30 transition-colors"
                  title="Step forward"
                >
                  ▶
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1 bg-[#F0EFEA] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1E293B] rounded-full transition-all"
                    style={{ width: `${(currentStep / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-[#787774] font-mono">
                  {currentStep}/{totalCount}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      <p className="text-[10px] text-[#787774] mt-2">Data source: FEMA OpenFEMA</p>
    </div>
  );
}
