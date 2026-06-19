"use client";

import { useEffect, useState } from "react";
import { getCityInterventionRecords } from "@/lib/api";
import type { InterventionRecord } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

function outcomeColor(outcome: string): string {
  const lower = outcome.toLowerCase();
  if (lower.includes("completed") || lower.includes("reduced") || lower.includes("eliminated") || lower.includes("protected")) return "#346538";
  if (lower.includes("not started") || lower.includes("not adopted") || lower.includes("not funded") || lower.includes("0%")) return "#9F2F2D";
  return "#956400";
}

function outcomeBg(outcome: string): string {
  const lower = outcome.toLowerCase();
  if (lower.includes("completed") || lower.includes("reduced") || lower.includes("eliminated") || lower.includes("protected")) return "#E8F0E5";
  if (lower.includes("not started") || lower.includes("not adopted") || lower.includes("not funded") || lower.includes("0%")) return "#FDEBEC";
  return "#FBF3DB";
}

export function InterventionScorecard({ slug }: { slug: string }) {
  const [records, setRecords] = useState<InterventionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityInterventionRecords(slug).then(setRecords).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (!records.length) return null;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
      <p className="text-xs font-medium text-[#1E293B] mb-1">Intervention effectiveness scorecard</p>
      <p className="text-[10px] text-[#787774] mb-4">Real outcomes from implemented vs proposed interventions</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[#EAEAEA]">
              <th className="text-left text-[#787774] font-medium pb-2 pr-3">Intervention</th>
              <th className="text-right text-[#787774] font-medium pb-2 px-3">Cost</th>
              <th className="text-right text-[#787774] font-medium pb-2 px-3">Reduction</th>
              <th className="text-right text-[#787774] font-medium pb-2 px-3">ROI</th>
              <th className="text-left text-[#787774] font-medium pb-2 pl-3">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {[...records]
              .sort((a, b) => b.roi_ratio - a.roi_ratio)
              .map((r) => (
                <tr key={r.intervention_id} className="border-b border-[#EAEAEA]/50">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-[#1E293B]">{r.intervention_name}</p>
                    <p className="text-[10px] text-[#787774] mt-0.5 leading-tight">{r.description}</p>
                  </td>
                  <td className="text-right py-2.5 px-3 text-[#787774] font-mono whitespace-nowrap">
                    ${(r.estimated_cost_usd / 1_000_000).toFixed(0)}M
                  </td>
                  <td className="text-right py-2.5 px-3 text-[#346538] font-mono whitespace-nowrap">
                    ${(r.estimated_damage_reduction_usd / 1_000_000).toFixed(0)}M
                  </td>
                  <td className="text-right py-2.5 px-3 font-mono whitespace-nowrap">
                    {r.roi_ratio.toFixed(1)}x
                  </td>
                  <td className="py-2.5 pl-3">
                    <span
                      className="inline-block text-[9px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: outcomeBg(r.actual_outcome),
                        color: outcomeColor(r.actual_outcome),
                      }}
                    >
                      {r.actual_outcome || "N/A"}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[#787774] mt-3">Sorted by ROI ratio (highest first)</p>
    </div>
  );
}
