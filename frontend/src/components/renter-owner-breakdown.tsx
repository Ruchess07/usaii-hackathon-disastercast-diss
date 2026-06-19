"use client";

import { useEffect, useRef, useState } from "react";
import { getCityEvents } from "@/lib/api";
import type { DisasterEvent } from "@/types";
import { ChartSkeleton } from "@/components/ui/skeleton";

export function RenterOwnerBreakdown({ slug }: { slug: string }) {
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    getCityEvents(slug).then(setEvents).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!events.length || !canvasRef.current) return;
    const filtered = events.filter((e) => e.owner_registrations != null || e.renter_registrations != null);
    if (!filtered.length) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 200;
    canvasRef.current.width = w * dpr;
    canvasRef.current.height = h * dpr;
    canvasRef.current.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const pad = { top: 16, right: 60, bottom: 28, left: 16 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const maxReg = Math.max(
      ...filtered.map((e) => (e.owner_registrations || 0) + (e.renter_registrations || 0))
    ) * 1.15;

    const barW = Math.min(36, chartW / filtered.length * 0.5);

    filtered.forEach((e, i) => {
      const x = pad.left + (i / filtered.length) * chartW + (chartW / filtered.length - barW) / 2;
      const ownH = ((e.owner_registrations || 0) / maxReg) * chartH;
      const rentH = ((e.renter_registrations || 0) / maxReg) * chartH;

      const ownY = pad.top + chartH - ownH - rentH;
      const rentY = pad.top + chartH - rentH;

      ctx.fillStyle = "#1F6C9F";
      ctx.beginPath();
      ctx.roundRect(x, ownY, barW, ownH, [3, 3, 0, 0]);
      ctx.fill();

      ctx.fillStyle = "#956400";
      ctx.beginPath();
      ctx.roundRect(x, rentY, barW, rentH, [0, 0, 3, 3]);
      ctx.fill();

      ctx.fillStyle = "#787774";
      ctx.font = "8px Geist Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(e.year), x + barW / 2, pad.top + chartH + 16);
    });

    ctx.fillStyle = "#1F6C9F";
    ctx.font = "8px Geist Sans, sans-serif";
    ctx.textAlign = "left";
    ctx.fillRect(w - pad.right + 2, pad.top + 6, 8, 8);
    ctx.fillText("Owner", w - pad.right + 12, pad.top + 14);

    ctx.fillStyle = "#956400";
    ctx.fillRect(w - pad.right + 2, pad.top + 20, 8, 8);
    ctx.fillText("Renter", w - pad.right + 12, pad.top + 28);
  }, [events]);

  if (loading) return <ChartSkeleton />;
  if (!events.length || !events.some((e) => e.owner_registrations != null)) return null;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-1">Owner vs renter registrations</p>
      <p className="text-[10px] text-[#787774] mb-3">FEMA individual assistance registrations by tenure per event</p>
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
}
