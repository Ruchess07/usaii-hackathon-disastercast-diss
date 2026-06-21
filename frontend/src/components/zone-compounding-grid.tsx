"use client";

import { Fragment, useEffect, useState } from "react";
import { getCityZones } from "@/lib/api";
import type { ZoneData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

function cellColor(dmg: number, max: number): string {
  if (max === 0) return "#F7F6F3";
  const r = dmg / max;
  if (r < 0.05) return "#F7F6F3";
  if (r < 0.2) return "#FDEBEC";
  if (r < 0.4) return "#F5C6C5";
  if (r < 0.65) return "#E8918E";
  return "#9F2F2D";
}

export function ZoneCompoundingGrid({ slug }: { slug: string }) {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityZones(slug).then(setZones).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (!zones.length) return null;

  const years = [...new Set(zones.map((z) => z.event_year!).filter((y): y is number => y != null))].sort();
  const zoneNames = [...new Set(zones.map((z) => z.zone_name || z.neighborhood || ""))].sort();

  const maxDmg = Math.max(...zones.map((z) => z.damage_bn));

  const getDmg = (zone: string, year: number) => {
    const z = zones.find(
      (zr) => (zr.zone_name || zr.neighborhood) === zone && zr.event_year === year
    );
    return z ? z.damage_bn : 0;
  };

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-1">Compounding risk by zone</p>
      <p className="text-[10px] text-[#787774] mb-4">Damage intensity across years and zones — darker = worse</p>
      <div className="overflow-x-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `140px repeat(${years.length}, 72px)` }}>
          <div />
          {years.map((yr) => (
            <div key={yr} className="text-[9px] text-[#787774] font-mono text-center pb-1">
              {yr}
            </div>
          ))}
          {zoneNames.map((name) => (
            <Fragment key={name}>
              <div className="text-[10px] text-[#1E293B] font-medium truncate pr-2 self-center">
                {name}
              </div>
              {years.map((yr) => {
                const dmg = getDmg(name, yr);
                return (
                  <div
                    key={`${name}-${yr}`}
                    className="h-8 rounded-[4px] flex items-center justify-center text-[9px] font-medium"
                    style={{ backgroundColor: cellColor(dmg, maxDmg) }}
                    title={`${name} ${yr}: $${dmg.toFixed(2)}B`}
                  >
                    <span style={{ color: dmg / maxDmg > 0.5 ? "#fff" : "#1E293B" }}>
                      {dmg > 0 ? `$${dmg.toFixed(1)}` : "—"}
                    </span>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
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
