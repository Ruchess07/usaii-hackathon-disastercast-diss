"use client";

import { useEffect, useState } from "react";
import { getCityPatternExplanation } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function PatternBox({ slug }: { slug: string }) {
  const [explanation, setExplanation] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityPatternExplanation(slug)
      .then((r) => setExplanation(r.explanation))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-[#FBF3DB] border border-[#956400]/20 rounded-[8px] p-4 space-y-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <div className="bg-[#FBF3DB] border border-[#956400]/20 rounded-[8px] p-4">
      <p className="text-[10px] uppercase tracking-[0.1em] text-[#956400] font-medium mb-1">
        Pattern detected
      </p>
      <p className="text-sm text-[#956400] leading-relaxed">{explanation}</p>
    </div>
  );
}
