"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/skeleton";
import { postCityScenario } from "@/lib/api";
import type { ScenarioResponse } from "@/types";

interface CityResult {
  slug: string;
  name: string;
  disaster: string;
  loading: boolean;
  result: ScenarioResponse | null;
}

const CITIES = [
  { slug: "houston", name: "Houston", disaster: "Flood" },
  { slug: "los-angeles", name: "Los Angeles", disaster: "Wildfire" },
];

export default function CompareScenarioPage() {
  const [infra, setInfra] = useState(500);
  const [popGrowth, setPopGrowth] = useState(10);
  const [results, setResults] = useState<CityResult[]>(
    CITIES.map((c) => ({ ...c, loading: false, result: null }))
  );

  const handleRun = async (citySlug: string) => {
    setResults((prev) =>
      prev.map((r) => (r.slug === citySlug ? { ...r, loading: true } : r))
    );
    try {
      const res = await postCityScenario(citySlug, {
        infra_investment_mn: infra,
        population_growth_pct: popGrowth,
      });
      setResults((prev) =>
        prev.map((r) => (r.slug === citySlug ? { ...r, loading: false, result: res } : r))
      );
    } catch {
      setResults((prev) =>
        prev.map((r) => (r.slug === citySlug ? { ...r, loading: false } : r))
      );
    }
  };

  const handleRunAll = () => {
    CITIES.forEach((c) => handleRun(c.slug));
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#787774] mb-2 font-medium">
          Step 05 · Scenario comparison
        </p>
        <h1 className="text-xl md:text-2xl font-semibold text-[#1E293B] tracking-tight">
          Compare what-if scenarios across cities
        </h1>
      </div>

      {/* Unified scenario controls */}
      <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5">
        <p className="text-xs font-medium text-[#1E293B] mb-4">Scenario parameters (apply to both cities)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <label className="text-[11px] text-[#787774] block mb-1.5">
              Infrastructure investment: ${infra}M
            </label>
            <input
              type="range"
              min={0}
              max={2000}
              step={50}
              value={infra}
              onChange={(e) => setInfra(Number(e.target.value))}
              className="w-full accent-[#1E293B]"
            />
            <div className="flex justify-between text-[9px] text-[#787774] mt-0.5">
              <span>$0</span>
              <span>$2B</span>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#787774] block mb-1.5">
              Population growth: {popGrowth}%
            </label>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={popGrowth}
              onChange={(e) => setPopGrowth(Number(e.target.value))}
              className="w-full accent-[#1E293B]"
            />
            <div className="flex justify-between text-[9px] text-[#787774] mt-0.5">
              <span>0%</span>
              <span>50%</span>
            </div>
          </div>
        </div>
        <Button onClick={handleRunAll} size="lg">
          Run scenario for both cities
        </Button>
      </div>

      {/* Side-by-side results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((city) => (
          <div key={city.slug} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1E293B]">{city.name}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRun(city.slug)}
                disabled={city.loading}
              >
                {city.loading ? "Running..." : "Run"}
              </Button>
            </div>

            {city.loading ? (
              <ChartSkeleton />
            ) : city.result ? (
              <div className="space-y-3">
                <MetricCard
                  label="Base cost (next event)"
                  value={`$${city.result.base_case.total_projected_cost_bn.toFixed(1)}B`}
                  variant="cost"
                />
                <MetricCard
                  label="Scenario cost"
                  value={`$${city.result.scenario.total_projected_cost_bn.toFixed(1)}B`}
                  variant={city.result.difference_bn > 0 ? "success" : "cost"}
                />
                {city.result.difference_bn > 0 && (
                  <MetricCard
                    label="Savings vs doing nothing"
                    value={`$${city.result.difference_bn.toFixed(1)}B`}
                    subtitle={`${city.result.scenario_params.total_reduction_pct}% reduction`}
                    variant="success"
                  />
                )}
              </div>
            ) : (
              <div className="bg-[#F7F6F3] border border-[#EAEAEA] rounded-[8px] p-6 text-center">
                <p className="text-[11px] text-[#787774]">Click "Run" to see results</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Link href="/compare">
          <Button variant="secondary">← Back to comparison</Button>
        </Link>
        <Link href="/">
          <Button variant="ghost">Start Over</Button>
        </Link>
      </div>
    </div>
  );
}
