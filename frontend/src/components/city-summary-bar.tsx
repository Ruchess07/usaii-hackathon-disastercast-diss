"use client";

import { MetricCard } from "@/components/ui/card";
import { Skeleton, MetricSkeleton } from "@/components/ui/skeleton";
import { getCitySummary } from "@/lib/api";
import type { CitySummary } from "@/types";
import { useEffect, useState } from "react";

interface CitySummaryProps {
  slug: string;
}

export function CitySummaryBar({ slug }: CitySummaryProps) {
  const [summary, setSummary] = useState<CitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCitySummary(slug).then(setSummary).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <MetricSkeleton key={i} />)}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        label="Total historic damage"
        value={`$${summary.total_damage_bn.toFixed(0)}B`}
        subtitle={summary.years_covered}
      />
      <MetricCard
        label="Major events"
        value={String(summary.total_events)}
        subtitle="Federal declarations"
      />
      <MetricCard
        label="Total displaced"
        value={summary.total_displaced.toLocaleString()}
        subtitle="Cumulative"
      />
      <MetricCard
        label="Cost escalation"
        value={`${summary.escalation_rate_pct}%/yr`}
        subtitle="FEMA pattern analysis"
        variant="warning"
      />
    </div>
  );
}
