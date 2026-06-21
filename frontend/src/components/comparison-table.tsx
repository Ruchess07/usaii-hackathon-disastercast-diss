"use client";

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

interface Props {
  data: CityCompareData[];
}

function Row({ label, values, format }: { label: string; values: (string | number)[]; format?: (v: number) => string }) {
  return (
    <tr className="border-b border-[#EAEAEA]">
      <td className="py-2 pr-4 text-[11px] text-[#787774] font-medium">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-2 px-3 text-[12px] text-[#1E293B] font-medium">
          {typeof v === "number" && format ? format(v) : String(v)}
        </td>
      ))}
    </tr>
  );
}

export function ComparisonTable({ data }: Props) {
  if (data.length < 2) return null;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5 overflow-x-auto">
      <p className="text-xs font-medium text-[#1E293B] mb-3">City comparison</p>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[#EAEAEA]">
            <th className="pb-2 pr-4 text-[10px] uppercase tracking-[0.05em] text-[#787774]">Metric</th>
            {data.map((d) => (
              <th key={d.slug} className="pb-2 px-3 text-[11px] text-[#1E293B] font-semibold">
                {d.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row label="Disaster type" values={data.map((d) => d.disaster)} />
          <Row label="Total historic damage" values={data.map((d) => d.summary.total_damage_bn)} format={(v) => `$${v.toFixed(0)}B`} />
          <Row label="Major events" values={data.map((d) => d.summary.total_events)} />
          <Row label="Total displaced" values={data.map((d) => d.summary.total_displaced)} format={(v) => v.toLocaleString()} />
          <Row label="Cost escalation /yr" values={data.map((d) => d.summary.escalation_rate_pct)} format={(v) => `${v}%`} />
          <Row label="Next event cost" values={data.map((d) => d.projection.total_projected_cost_bn)} format={(v) => `$${v.toFixed(1)}B`} />
          <Row label="Preventable (60%)" values={data.map((d) => d.savings.prevented_cost_bn)} format={(v) => `$${v.toFixed(1)}B`} />
          <Row label="Years covered" values={data.map((d) => d.summary.years_covered)} />
        </tbody>
      </table>
    </div>
  );
}
