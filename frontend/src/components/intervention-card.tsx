"use client";

import type { Intervention } from "@/types";

export function InterventionCard({
  intervention,
  zone,
}: {
  intervention: Intervention;
  zone: string;
}) {
  const r = intervention;
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5 border-l-4 border-l-[#346538] space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#346538]">
        Priority {r.rank}
      </p>
      <p className="text-sm font-semibold text-[#1E293B]">{r.action}</p>
      <p className="text-xs text-[#787774] leading-relaxed">{r.detail}</p>
      <div className="flex flex-wrap gap-4 text-xs text-[#1E293B] pt-1">
        <span>
          Cost: <strong>${r.estimated_cost_mn}M</strong>
        </span>
        <span>
          Saving: <strong>${r.projected_saving_mn}M</strong>
        </span>
        <span>
          ROI: <strong>{r.roi}</strong>
        </span>
      </div>
      <p className="text-[10px] text-[#1F6C9F]">Affected zones: {zone}</p>
      <p className="text-[10px] text-[#787774]">Evidence: {r.evidence}</p>
    </div>
  );
}
