"use client";

import { useState } from "react";
import {
  getCitySummary,
  getCityProjection,
  postRecommendations,
  postPolicyBrief,
} from "@/lib/api";

export function PolicyBriefGenerator({ slug, cityName }: { slug: string; cityName: string }) {
  const [brief, setBrief] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(false);
    try {
      const [summary, projection] = await Promise.all([
        getCitySummary(slug),
        getCityProjection(slug),
      ]);

      const recs = await postRecommendations(slug, {
        next_event_cost_bn: projection.projection.total_projected_cost_bn,
        total_historic_cost_bn: summary.total_damage_bn,
        total_events: summary.total_events,
        years_covered: summary.years_covered,
      });

      const res = await postPolicyBrief(slug, {
        next_event_cost_bn: projection.projection.total_projected_cost_bn,
        recommendations: recs,
      });

      setBrief(res.brief);
    } catch {
      setError(true);
      setBrief(null);
    }
    setGenerating(false);
  };

  return (
    <div className="rounded-lg border border-[#E8E6DF] bg-white p-4">
      <h3 className="text-sm font-semibold text-[#1E293B] mb-1">
        Policy brief, {cityName}
      </h3>
      <p className="mb-3 text-xs text-[#787774]">
        A one page summary generated from the live cost projection and ranked
        recommendations above, ready to bring into a budget committee meeting.
      </p>

      {!brief && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md border border-[#1F6C9F] bg-[#E1F3FE] px-4 py-2 text-xs font-medium text-[#1F6C9F] hover:bg-[#D1ECFE] disabled:opacity-50"
        >
          {generating ? "Drafting..." : "Generate policy brief"}
        </button>
      )}

      {error && (
        <p className="mt-2 text-xs text-[#9F2F2D]">
          Could not generate the brief right now. Try again in a moment.
        </p>
      )}

      {brief && (
        <div className="mt-2 space-y-3">
          <div className="rounded-md border border-[#E8E6DF] bg-[#F7F6F3] p-3 text-sm leading-relaxed text-[#1E293B] whitespace-pre-line">
            {brief}
          </div>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(brief)}`}
            download={`disastercast_policy_brief_${slug}.txt`}
            className="inline-block rounded-md border border-[#346538] px-4 py-2 text-xs font-medium text-[#346538] hover:bg-[#E8F0E5]"
          >
            Download policy brief
          </a>
        </div>
      )}
    </div>
  );
}
