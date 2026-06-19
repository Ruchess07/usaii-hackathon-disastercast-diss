"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ComparisonTable } from "@/components/comparison-table";
import { ComparisonBarChart } from "@/components/comparison-bar-chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { CitySummary, CostProjection, Intervention } from "@/types";

interface CityCompareData {
  slug: string;
  name: string;
  disaster: string;
  summary: CitySummary;
  projection: CostProjection;
  savings: { next_event_cost_bn: number; prevented_cost_bn: number; reduction_pct: number };
  top_interventions: Intervention[];
}

export default function ComparePage() {
  const [data, setData] = useState<CityCompareData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/compare?cities=houston,los-angeles")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#787774] mb-2 font-medium">
          Step 04 · Side-by-side comparison
        </p>
        <h1 className="text-xl md:text-2xl font-semibold text-[#1E293B] tracking-tight">
          How Houston and Los Angeles compare
        </h1>
      </div>

      <ComparisonTable data={data} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComparisonBarChart
          label="Total historic damage ($B)"
          cities={data.map((d) => ({
            name: d.name,
            value: d.summary.total_damage_bn,
            color: d.name === "Houston" ? "#1F6C9F" : "#956400",
          }))}
        />
        <ComparisonBarChart
          label="Projected next event cost ($B)"
          cities={data.map((d) => ({
            name: d.name,
            value: d.projection.total_projected_cost_bn,
            color: d.name === "Houston" ? "#1F6C9F" : "#956400",
          }))}
        />
      </div>

      <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
        <p className="text-xs font-medium text-[#1E293B] mb-3">Top interventions by city</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.map((d) => (
            <div key={d.slug}>
              <p className="text-[11px] font-semibold text-[#1E293B] mb-2">{d.name}</p>
              {d.top_interventions.map((inv) => (
                <div key={inv.rank} className="flex items-center justify-between text-[11px] py-1 border-b border-[#EAEAEA]/50">
                  <span className="text-[#787774]">{inv.rank}. {inv.action}</span>
                  <span className="text-[#346538] font-medium">{inv.roi}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Link href="/interventions?city=houston">
          <Button variant="secondary">← Back to Priorities</Button>
        </Link>
        <Link href="/">
          <Button variant="ghost">Start Over</Button>
        </Link>
      </div>
    </div>
  );
}
