"use client";

import { useEffect, useState } from "react";
import { getCityAffectedZones } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function AffectedZonesBadge({ slug }: { slug: string }) {
  const [zones, setZones] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityAffectedZones(slug)
      .then((r) => setZones(r.zones))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton className="h-8 w-full" />;

  return (
    <div className="bg-[#E1F3FE] border border-[#1F6C9F]/20 rounded-[8px] px-4 py-2.5">
      <p className="text-[11px] text-[#1F6C9F]">
        <span className="font-medium">Most affected zones:</span> {zones}
      </p>
    </div>
  );
}
