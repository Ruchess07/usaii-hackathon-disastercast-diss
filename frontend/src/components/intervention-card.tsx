"use client";

import { useState } from "react";
import type { Intervention } from "@/types";

export function InterventionCard({
  intervention,
  zone,
}: {
  intervention: Intervention;
  zone: string;
}) {
  const r = intervention;
  const [expanded, setExpanded] = useState(false);
  const hasExplanation = !!r.plain_explanation;

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

      {hasExplanation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-medium text-[#1F6C9F] hover:underline pt-1"
        >
          {expanded ? "Hide explanation \u25B2" : "New to this? Explain in plain language \u25BC"}
        </button>
      )}

      {expanded && hasExplanation && (
        <div className="mt-2 space-y-2 rounded-md bg-[#F7F6F3] p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#787774]">
              What this means
            </p>
            <p className="text-xs leading-relaxed text-[#1E293B] mt-1">
              {r.plain_explanation}
            </p>
          </div>
          {r.why_this_matters && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#787774]">
                Why it matters
              </p>
              <p className="text-xs leading-relaxed text-[#346538] mt-1">
                {r.why_this_matters}
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-[#1F6C9F] pt-1">Affected zones: {zone}</p>
      <p className="text-[10px] text-[#787774]">Evidence: {r.evidence}</p>
    </div>
  );
}
