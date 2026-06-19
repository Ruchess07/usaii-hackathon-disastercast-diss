"use client";

import { useEffect, useState } from "react";
import { getCityZones } from "@/lib/api";
import type { ZoneData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

function damageColor(damageBn: number, maxBn: number): string {
  if (maxBn === 0) return "#F7F6F3";
  const ratio = damageBn / maxBn;
  if (ratio < 0.1) return "#F7F6F3";
  if (ratio < 0.25) return "#FDEBEC";
  if (ratio < 0.5) return "#F5C6C5";
  if (ratio < 0.75) return "#E8918E";
  return "#9F2F2D";
}

export function ZoneHeatmap({ slug }: { slug: string }) {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityZones(slug).then(setZones).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton className="h-32 w-full" />;
  if (!zones.length) return null;

  const byZone: Record<string, number> = {};
  zones.forEach((z) => {
    const name = z.zone_name || z.neighborhood || "";
    byZone[name] = (byZone[name] || 0) + z.damage_bn;
  });

  const entries = Object.entries(byZone).sort((a, b) => b[1] - a[1]);
  const maxBn = Math.max(...entries.map(([, v]) => v));

  const cols = slug === "houston" ? 3 : 4;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-3">Zone damage heatmap</p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {entries.map(([name, dmg]) => (
          <div
            key={name}
            className="rounded-[6px] p-3 text-center transition-colors"
            style={{ backgroundColor: damageColor(dmg, maxBn) }}
            title={`${name}: $${dmg.toFixed(2)}B total damage`}
          >
            <p className="text-[10px] font-medium text-[#1E293B] leading-tight truncate">
              {name}
            </p>
            <p
              className="text-[11px] font-semibold mt-0.5"
              style={{
                color: dmg / maxBn > 0.5 ? "#FFFFFF" : "#1E293B",
              }}
            >
              ${dmg.toFixed(2)}B
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[9px] text-[#787774]">
        <span>Low</span>
        <div className="flex gap-0.5">
          {["#F7F6F3", "#FDEBEC", "#F5C6C5", "#E8918E", "#9F2F2D"].map((c) => (
            <span key={c} className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span>High damage</span>
      </div>
    </div>
  );
}
