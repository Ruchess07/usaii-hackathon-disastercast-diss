"use client";

import { useEffect, useState } from "react";
import { getCities } from "@/lib/api";
import type { City } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CitySelectorProps {
  onSelect: (slug: string) => void;
}

export function CitySelector({ onSelect }: CitySelectorProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCities()
      .then(setCities)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#787774] mb-3 font-medium">
          Step 01 · Select a city
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-[#1E293B] tracking-tight leading-tight">
          Disaster Intervention<br />Strategy Simulator
        </h1>
        <p className="text-sm text-[#787774] mt-2 max-w-md">
          AI-powered cost of inaction simulator for flood and wildfire prevention policy.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-[#EAEAEA] rounded-[8px] p-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cities.map((city) => {
            const isSelected = selected === city.slug;
            return (
              <button
                key={city.slug}
                onClick={() => setSelected(city.slug)}
                className={`text-left border rounded-[8px] p-5 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-[#1E293B] bg-[#F7F6F3]"
                    : "border-[#EAEAEA] bg-white hover:border-[#1E293B]/30"
                }`}
              >
                <p className="text-sm font-semibold text-[#1E293B]">{city.name}</p>
                <p className="text-xs text-[#787774] mt-1">{city.disaster} risk zone</p>
                <div
                  className={`mt-3 h-1.5 rounded-full transition-colors duration-300 ${
                    isSelected ? "bg-[#1E293B]" : "bg-[#EAEAEA]"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      <Button
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
        size="lg"
      >
        Continue →
      </Button>
    </div>
  );
}
