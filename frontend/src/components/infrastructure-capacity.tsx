"use client";

import { useEffect, useState } from "react";
import { getCityInfrastructure } from "@/lib/api";
import type { InfrastructureProject } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

function capacityColor(pct: number): string {
  if (pct >= 66) return "#346538";
  if (pct >= 33) return "#956400";
  return "#9F2F2D";
}

function capacityBg(pct: number): string {
  if (pct >= 66) return "#E8F0E5";
  if (pct >= 33) return "#FBF3DB";
  return "#FDEBEC";
}

export function InfrastructureCapacity({ slug }: { slug: string }) {
  const [projects, setProjects] = useState<InfrastructureProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityInfrastructure(slug).then(setProjects).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (!projects.length) return null;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-1">Infrastructure capacity status</p>
      <p className="text-[10px] text-[#787774] mb-4">Current capacity and status of key projects</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {projects.map((p) => (
          <div
            key={p.project_name}
            className="border border-[#EAEAEA] rounded-[6px] p-3"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium text-[#1E293B] leading-tight pr-2">
                {p.project_name}
              </p>
              <span
                className="text-[9px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{
                  backgroundColor: capacityBg(p.capacity_pct),
                  color: capacityColor(p.capacity_pct),
                }}
              >
                {p.capacity_pct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#F0EFEA] rounded-full mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${p.capacity_pct}%`,
                  backgroundColor: capacityColor(p.capacity_pct),
                }}
              />
            </div>
            <p className="text-[10px] text-[#787774] leading-relaxed mb-1">
              {p.description}
            </p>
            <p className="text-[9px] text-[#787774] font-mono">
              {p.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
