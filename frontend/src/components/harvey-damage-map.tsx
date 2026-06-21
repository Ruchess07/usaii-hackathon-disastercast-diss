"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { getHoustonDamageMap } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// Leaflet must be loaded client-side only (no SSR) because it accesses `window`
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

interface DamagePoint {
  lat: number;
  lon: number;
  dmg: "DES" | "MAJ" | "MIN" | "AFF";
  ws: string;
  depth: number;
  value: number;
  addr: string;
}

const DAMAGE_COLORS: Record<string, string> = {
  DES: "#9F2F2D",
  MAJ: "#E8918E",
  MIN: "#F5C6C5",
  AFF: "#A8C99A",
};

const DAMAGE_LABELS: Record<string, string> = {
  DES: "Destroyed",
  MAJ: "Major damage",
  MIN: "Minor damage",
  AFF: "Affected",
};

export function HarveyDamageMap() {
  const [points, setPoints] = useState<DamagePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProperties, setTotalProperties] = useState(0);

  useEffect(() => {
    setLoading(true);
    getHoustonDamageMap()
      .then((mapData) => {
        setPoints(mapData.points);
        setTotalProperties(mapData.total_properties);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[500px] w-full" />;
  if (!points.length) {
    return (
      <div className="rounded-lg border border-[#E8E6DF] bg-white p-6 text-sm text-[#787774]">
        Map data unavailable. Add harvey_damage_lite.json to the data/ folder.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#E8E6DF] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1E293B]">
            Harvey 2017 property damage — {totalProperties.toLocaleString()} properties
          </h3>
          <div className="flex gap-3 text-xs">
            {Object.entries(DAMAGE_LABELS).map(([key, label]) => (
              <span key={key} className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: DAMAGE_COLORS[key] }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ height: "500px", width: "100%", position: "relative", borderRadius: "6px", overflow: "hidden" }}>
          <MapContainer
            center={[29.76, -95.37]}
            zoom={10}
            style={{ height: "500px", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            {points.map((p, i) => (
              <CircleMarker
                key={i}
                center={[p.lat, p.lon]}
                radius={p.dmg === "DES" || p.dmg === "MAJ" ? 3 : 2}
                pathOptions={{
                  color: DAMAGE_COLORS[p.dmg],
                  fillColor: DAMAGE_COLORS[p.dmg],
                  fillOpacity: 0.7,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{DAMAGE_LABELS[p.dmg]}</strong>
                    <br />
                    {p.addr}
                    <br />
                    Watershed: {p.ws}
                    <br />
                    Flood depth: {p.depth.toFixed(1)} ft
                    <br />
                    Property value: ${p.value.toLocaleString()}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <p className="mt-2 text-xs text-[#787774]">
          Source: FEMA/HCAD Harvey merged dataset. Sampled for performance — all major/destroyed
          properties shown, minor/affected sampled at 10-30%. Buffalo Bayou had the highest
          damage severity (36% major or destroyed) and San Jacinto River the highest destruction
          rate (52%) — both watersheds with the deepest average flood depths in the dataset.
        </p>
      </div>
    </div>
  );
}
