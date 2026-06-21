"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getCityDataFreshness } from "@/lib/api";

interface DatasetMeta {
  path: string;
  label: string;
  last_updated: string;
  rows: number;
  source: string;
}

function ageIndicator(dateStr: string): { color: string; label: string } {
  const dt = new Date(dateStr);
  const now = new Date();
  const months = (now.getFullYear() - dt.getFullYear()) * 12 + now.getMonth() - dt.getMonth();
  if (months > 24) return { color: "#9F2F2D", label: "stale" };
  if (months > 12) return { color: "#A38D2E", label: "aging" };
  return { color: "#346538", label: "fresh" };
}

export function DataFreshnessFooter() {
  const path = usePathname();
  const sp = useSearchParams();
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);

  useEffect(() => {
    const onDash = path.startsWith("/dashboard");
    const onInt = path.startsWith("/interventions");
    if (!onDash && !onInt) return;
    const slug = sp?.get("city") || "houston";
    getCityDataFreshness(slug).then(setDatasets).catch(() => {});
  }, [path, sp]);

  if (!datasets.length) return null;

  const oldest = datasets.reduce((a, b) => (a.last_updated < b.last_updated ? a : b));
  const { color, label } = ageIndicator(oldest.last_updated);

  return (
    <div className="border-t border-[#EAEAEA] bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-2 flex items-center justify-between text-[10px] text-[#787774]">
        <span>
          Data sources:{" "}
          {datasets.map((d, i) => (
            <span key={d.path}>
              {d.label}
              {i < datasets.length - 1 ? ", " : ""}
            </span>
          ))}
        </span>
        <span style={{ color }}>
          Last update: {oldest.last_updated} ({label})
        </span>
      </div>
    </div>
  );
}
