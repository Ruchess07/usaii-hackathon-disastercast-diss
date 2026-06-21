"use client";

import { useEffect, useState, useCallback } from "react";
import { postCityScenario } from "@/lib/api";
import type { ScenarioResponse } from "@/types";
import { MetricCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ScenarioSliders({ slug, onDifference }: { slug: string; onDifference?: (bn: number) => void }) {
  const [infra, setInfra] = useState(0);
  const [popGrowth, setPopGrowth] = useState(0);
  const [result, setResult] = useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchScenario = useCallback(async () => {
    setLoading(true);
    try {
      const res = await postCityScenario(slug, {
        infra_investment_mn: infra,
        population_growth_pct: popGrowth || undefined,
      });
      setResult(res);
      onDifference?.(res.difference_bn);
    } catch {
      setResult(null);
    }
    setLoading(false);
  }, [slug, infra, popGrowth, onDifference]);

  useEffect(() => {
    const timer = setTimeout(fetchScenario, 300);
    return () => clearTimeout(timer);
  }, [fetchScenario]);

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5 space-y-4">
      <p className="text-xs font-medium text-[#1E293B]">What-if scenario simulator</p>
      <p className="text-[11px] text-[#787774] -mt-3 leading-relaxed">
        Base cost is the projected cost of the next disaster if nothing changes. Scenario
        cost recalculates that projection using the sliders below, so you can test how
        much a specific investment or a different population growth assumption actually
        changes the number.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-[#787774] flex justify-between">
            <span>Infrastructure investment</span>
            <span className="font-medium text-[#1E293B]">${infra}M</span>
          </label>
          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={infra}
            onChange={(e) => setInfra(Number(e.target.value))}
            className="w-full accent-[#346538]"
          />
          <div className="flex justify-between text-[9px] text-[#787774]">
            <span>$0</span>
            <span>$2B</span>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[#787774] flex justify-between">
            <span>Population growth in vulnerable zones</span>
            <span className="font-medium text-[#1E293B]">+{popGrowth}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            value={popGrowth}
            onChange={(e) => setPopGrowth(Number(e.target.value))}
            className="w-full accent-[#956400]"
          />
          <div className="flex justify-between text-[9px] text-[#787774]">
            <span>0%</span>
            <span>+50%</span>
          </div>
          <p className="text-[10px] text-[#A38D2E] mt-1 italic">
            Reference: Harris County grew 48% from 2000 to 2025 (US Census) —
            use this as a real-world anchor when setting the slider.
          </p>
        </div>
      </div>

      {loading && <Skeleton className="h-12 w-full" />}

      {result && !loading && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#EAEAEA]">
          <MetricCard
            label="Base cost"
            value={`$${result.base_case.total_projected_cost_bn.toFixed(1)}B`}
            variant="cost"
          />
          <MetricCard
            label="Scenario cost"
            value={`$${result.scenario.total_projected_cost_bn.toFixed(1)}B`}
            variant={result.difference_bn > 0 ? "success" : "default"}
          />
          <MetricCard
            label="Difference"
            value={`$${result.difference_bn.toFixed(1)}B`}
            subtitle={`${result.scenario_params.total_reduction_pct}% reduction`}
            variant={result.difference_bn > 0 ? "success" : "default"}
          />
        </div>
      )}
    </div>
  );
}
