"use client";

import { useEffect, useState } from "react";
import { getGlossary } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function GlossaryPage() {
  const [terms, setTerms] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGlossary().then(setTerms).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#787774] mb-2 font-medium">
          Reference · Key terms
        </p>
        <h1 className="text-xl md:text-2xl font-semibold text-[#1E293B] tracking-tight">
          Disaster policy glossary
        </h1>
        <p className="text-sm text-[#787774] mt-1 max-w-xl">
          Plain-language definitions of terms used throughout this tool.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {terms && Object.entries(terms).map(([term, def]) => (
            <details
              key={term}
              className="group bg-white border border-[#EAEAEA] rounded-[8px] overflow-hidden"
            >
              <summary className="text-sm font-medium text-[#1E293B] px-5 py-3.5 cursor-pointer list-none flex items-center justify-between hover:bg-[#F7F6F3] transition-colors">
                <span className="capitalize">{term}</span>
                <span className="text-[#787774] text-[10px] transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <div className="px-5 pb-4">
                <p className="text-[13px] text-[#787774] leading-relaxed">{def}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
