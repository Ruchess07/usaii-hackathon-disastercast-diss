"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { getCityHomelessness, DisasterHomelessEvent } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface HomelessYear {
  year: number;
  total: number;
  under_18: number;
  unsheltered: number;
}

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
  const [trend, setTrend] = useState<HomelessYear[]>([]);
  const [impact, setImpact] = useState<DisasterImpact | null>(null);
  const [allEvents, setAllEvents] = useState<DisasterHomelessEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityHomelessness(slug)
      .then((data) => {
        setTrend(data.trend);
        setImpact(data.disaster_impact);
        setAllEvents(data.all_disaster_events || []);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!trend.length) return null;

  return (
    <div className="rounded-lg border border-[#E8E6DF] bg-white p-4">
      <h3 className="text-sm font-semibold text-[#1E293B]">
        The human cost — homelessness trend, {cityName}
      </h3>
      <p className="mb-3 text-xs text-[#787774]">
        Source: HUD Annual Homeless Assessment Report, Point-in-Time Count (2007-2024).
        Every dashed line below is a recorded {cityName === "Houston" ? "flood" : "wildfire"} event.
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#787774" }} />
          <YAxis tick={{ fontSize: 11, fill: "#787774" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8E6DF" }}
          />
          <Line type="monotone" dataKey="total" stroke="#9F2F2D" strokeWidth={2} dot={{ r: 3 }} name="Total homeless" />
          <Line type="monotone" dataKey="unsheltered" stroke="#E8918E" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} name="Unsheltered" />
          {allEvents.map((ev) => (
            <ReferenceLine
              key={ev.year + ev.event}
              x={ev.year}
              stroke="#A8A29E"
              strokeDasharray="2 2"
              label={{ value: ev.year.toString(), fontSize: 9, fill: "#A8A29E", position: "top" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Every event listed below the chart with its individual impact */}
      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#787774]">
          How each event affected homelessness
        </p>
        {allEvents.map((ev) => (
          <div
            key={ev.year + ev.event}
            className={`rounded-md border p-3 text-xs leading-relaxed ${
              ev.pct_change !== null && ev.pct_change > 5
                ? "border-[#F5C6C5] bg-[#FDEBEC]"
                : "border-[#E8E6DF] bg-[#F7F6F3]"
            }`}
          >
            <div className="flex items-center justify-between">
              <strong className="text-[#1E293B]">{ev.event} ({ev.year})</strong>
              {ev.pct_change !== null ? (
                <span
                  className={`font-semibold ${
                    ev.pct_change > 5 ? "text-[#9F2F2D]" : "text-[#787774]"
                  }`}
                >
                  {ev.pct_change > 0 ? "+" : ""}
                  {ev.pct_change}% homelessness
                </span>
              ) : (
                <span className="font-semibold text-[#787774]">Not yet measured</span>
              )}
            </div>
            <p className="mt-1 text-[#1E293B]">
              {ev.after_count !== null
                ? `${ev.before_count.toLocaleString()} (${ev.before_year}) → ${ev.after_count.toLocaleString()} (${ev.after_year})`
                : `${ev.before_count.toLocaleString()} homeless as of ${ev.before_year}, latest count before this event`}
            </p>
            <p className="mt-1 italic text-[#787774]">{ev.note}</p>
          </div>
        ))}
      </div>

      {impact && (
        <div className="mt-3 rounded-md border border-[#F5C6C5] bg-[#FDEBEC] p-3 text-xs leading-relaxed text-[#1E293B]">
          <strong className="text-[#9F2F2D]">
            Biggest single impact: {impact.disaster} increased homelessness by {impact.pct_increase}%
          </strong>{" "}
          — from {impact.pre_disaster_count.toLocaleString()} ({impact.pre_disaster_year}) to{" "}
          {impact.post_disaster_count.toLocaleString()} ({impact.post_disaster_year}). Source: {impact.source}.
          {impact.note && <span className="block mt-1 italic">{impact.note}</span>}
        </div>
      )}
    </div>
  );
}
