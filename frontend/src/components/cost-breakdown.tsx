"use client";

import { useEffect, useState } from "react";
import { getCityProjection, getCityInfrastructure, getCityEvents } from "@/lib/api";
import type { ProjectionResponse, InfrastructureProject, DisasterEvent } from "@/types";
import { MetricCard } from "@/components/ui/card";
import { MetricSkeleton } from "@/components/ui/skeleton";
import { MetricSparkline } from "@/components/metric-sparkline";

function SourceNote({ label, source }: { label: string; source: string }) {
  return (
    <details className="group text-[10px] leading-relaxed">
      <summary className="cursor-pointer text-[#787774] hover:text-[#1E293B] transition-colors">
        {label} —<span className="underline decoration-dotted ml-1">source</span>
      </summary>
      <p className="mt-1 pl-3 text-[#5F5B56] border-l border-[#EAEAEA]">{source}</p>
    </details>
  );
}

function extractSparkline(events: DisasterEvent[], key: (e: DisasterEvent) => number): number[] {
  return events.map(key).filter((v) => v > 0);
}

export function CostBreakdown({ slug }: { slug: string }) {
  const [projection, setProjection] = useState<ProjectionResponse | null>(null);
  const [infra, setInfra] = useState<InfrastructureProject[] | null>(null);
  const [sparkCosts, setSparkCosts] = useState<number[]>([]);
  const [sparkDisplaced, setSparkDisplaced] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCityProjection(slug),
      getCityInfrastructure(slug),
      getCityEvents(slug),
    ]).then(([proj, infraData, events]) => {
      setProjection(proj);
      setInfra(infraData);
      setSparkCosts(extractSparkline(events, (e) => e.total_damage_bn));
      setSparkDisplaced(extractSparkline(events, (e) => e.total_displaced));
    }).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => <MetricSkeleton key={i} />)}
      </div>
    );
  }

  if (!projection) return null;

  const { projection: p, savings: s } = projection;
  const infraGaps = infra ? infra.filter((x) => x.capacity_pct < 50) : [];

  return (
    <div className="space-y-4">
      {/* Projected cost banner */}
      <div className="bg-[#FDEBEC] border border-[#9F2F2D]/20 rounded-[8px] p-4">
        <p className="text-[10px] uppercase tracking-[0.1em] text-[#9F2F2D] font-medium">
          Projected next-event cost if nothing changes
        </p>
        <p className="text-2xl font-semibold text-[#9F2F2D] mt-1">
          ${p.total_projected_cost_bn.toFixed(1)}B
        </p>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <MetricCard
          label="Infrastructure"
          value={`$${p.direct_damage_bn.toFixed(1)}B`}
          subtitle="Repair cost"
          variant="cost"
          chart={<MetricSparkline values={sparkCosts} color="#9F2F2D" />}
        />
        <MetricCard
          label="Displaced"
          value={p.est_displaced.toLocaleString()}
          subtitle={`$${p.displacement_cost_mn.toFixed(0)}M housing`}
          chart={<MetricSparkline values={sparkDisplaced} color="#787774" />}
        />
        <MetricCard
          label="Healthcare"
          value={`$${p.healthcare_cost_mn.toFixed(0)}M`}
          subtitle="Emergency care"
        />
        <MetricCard
          label="School days"
          value={`${p.school_days_lost.toLocaleString()} days`}
          subtitle={`$${p.school_cost_mn.toFixed(0)}M system cost`}
        />
        <MetricCard
          label="Lost wages"
          value={`$${p.lost_wages_mn.toFixed(0)}M`}
          subtitle="Worker impact"
        />
        <MetricCard
          label="Homelessness risk"
          value={(p.est_displaced * 0.12).toFixed(0)}
          subtitle="At risk of homelessness"
          variant="warning"
        />
      </div>

      {/* Source citations */}
      <div className="bg-[#F7F6F3] rounded-[8px] p-3 space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.1em] text-[#787774] font-medium">
          Cost methodology & sources
        </p>
        <SourceNote label="Displacement" source={p.displacement_source} />
        <SourceNote label="Healthcare" source={p.healthcare_source} />
        <SourceNote label="School days" source={p.school_source} />
        <SourceNote label="Lost wages" source={p.wages_source} />
        <SourceNote label="Homelessness" source={p.homelessness_source} />
      </div>

      {/* Infrastructure capacity gaps */}
      {infraGaps.length > 0 && (
        <div className="bg-[#FBF3DB] border border-[#A38D2E]/20 rounded-[8px] p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#7A6A1C] font-medium">
            Infrastructure capacity gaps
          </p>
          {infraGaps.map((proj) => (
            <div key={proj.project_name} className="flex items-center justify-between text-sm">
              <span className="text-[#1E293B]">{proj.project_name}</span>
              <span className="text-[#7A6A1C] font-medium">
                {proj.capacity_pct}% capacity
              </span>
            </div>
          ))}
          <p className="text-[10px] text-[#7A6A1C]">
            Below 50% capacity — these projects need investment to meet current risk levels.
          </p>
        </div>
      )}
    </div>
  );
}
