"use client";

import { useEffect, useState } from "react";
import { getCityHomelessness } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface DisasterImpact {
  pre_disaster_year: number;
  pre_disaster_count: number;
  post_disaster_year: number;
  post_disaster_count: number;
  pct_increase: number;
  disaster: string;
  source: string;
  note?: string;
}

export function HomelessnessTrendChart({ slug, cityName }: { slug: string; cityName: string }) {
  const [impact, setImpact] = useState<DisasterImpact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityHomelessness(slug)
      .then((data) => {
        setImpact(data.disaster_impact);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!impact) return null;

  return (
    <div className="rounded-lg border border-[#E8E6DF] bg-white p-4">
      <h3 className="text-sm font-semibold text-[#1E293B] mb-2">
        The human cost, {cityName}
      </h3>
      <div className="rounded-md border border-[#F5C6C5] bg-[#FDEBEC] p-3 text-xs leading-relaxed text-[#1E293B]">
        <strong className="text-[#9F2F2D]">
          {impact.disaster}, +{impact.pct_increase}% homelessness
        </strong>
        <br />
        {impact.pre_disaster_count.toLocaleString()} ({impact.pre_disaster_year}) to{" "}
        {impact.post_disaster_count.toLocaleString()} ({impact.post_disaster_year})
        <br />
        <span className="italic">Largest single-event spike in the dataset. Source: {impact.source}.</span>
        {impact.note && <span className="block mt-1 italic">{impact.note}</span>}
      </div>
    </div>
  );
}
