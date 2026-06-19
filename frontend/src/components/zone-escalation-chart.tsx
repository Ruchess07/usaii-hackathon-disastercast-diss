"use client";

import { useEffect, useRef, useState } from "react";
import { getCityZones } from "@/lib/api";
import type { ZoneData } from "@/types";
import { ChartSkeleton } from "@/components/ui/skeleton";

const COLORS = ["#1F6C9F", "#956400", "#346538", "#9F2F2D", "#6B4C9A", "#1E293B", "#787774", "#C75B39", "#2E7D6B"];

export function ZoneEscalationChart({ slug }: { slug: string }) {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLoading(true);
    getCityZones(slug).then(setZones).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!zones.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 260;
    canvasRef.current.width = w * dpr;
    canvasRef.current.height = h * dpr;
    canvasRef.current.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const pad = { top: 20, right: 90, bottom: 28, left: 48 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const years = [...new Set(zones.map((z) => z.event_year!).filter((y): y is number => y != null))].sort();
    const byZone: Record<string, { year: number; dmg: number }[]> = {};
    zones.forEach((z) => {
      const name = z.zone_name || z.neighborhood || "";
      if (!byZone[name]) byZone[name] = [];
      if (z.event_year != null) byZone[name].push({ year: z.event_year, dmg: z.damage_bn });
    });

    const zoneNames = Object.keys(byZone).sort();
    const maxDmg = Math.max(...zones.map((z) => z.damage_bn)) * 1.15;
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const xPos = (yr: number) => pad.left + ((yr - minYear) / (maxYear - minYear)) * chartW;
    const yPos = (d: number) => pad.top + chartH - (d / maxDmg) * chartH;

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
      ctx.font = "9px Geist Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText(`$${((maxDmg / 4) * (4 - i)).toFixed(1)}B`, pad.left - 8, y + 3);
    }

    // Year labels
    ctx.fillStyle = "#787774";
    ctx.font = "9px Geist Mono, monospace";
    ctx.textAlign = "center";
    years.forEach((yr) => ctx.fillText(String(yr), xPos(yr), pad.top + chartH + 16));

    // Lines per zone
    zoneNames.forEach((name, i) => {
      const pts = byZone[name].sort((a, b) => a.year - b.year);
      const color = COLORS[i % COLORS.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, j) => {
        const x = xPos(p.year);
        const y = yPos(p.dmg);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots
      ctx.fillStyle = color;
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(xPos(p.year), yPos(p.dmg), 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Label at last point
      const last = pts[pts.length - 1];
      ctx.fillStyle = color;
      ctx.font = "9px Geist Sans, sans-serif";
      ctx.textAlign = "left";
      const labelName = name.length > 16 ? name.slice(0, 14) + "…" : name;
      ctx.fillText(labelName, xPos(last.year) + 6, yPos(last.dmg) + 3);
    });
  }, [zones]);

  if (loading) return <ChartSkeleton />;
  if (!zones.length) return null;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-1">Damage escalation by zone</p>
      <p className="text-[10px] text-[#787774] mb-3">How each zone's damage has grown across events</p>
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
}
