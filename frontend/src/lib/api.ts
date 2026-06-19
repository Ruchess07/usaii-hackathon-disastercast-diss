import type {
  City,
  CitySummary,
  DisasterEvent,
  ZoneData,
  ProjectionResponse,
  CompoundingEvent,
  Intervention,
  InfrastructureProject,
  ScenarioResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export function getCities(): Promise<City[]> {
  return fetchJson("/api/cities");
}

export function getCitySummary(slug: string): Promise<CitySummary> {
  return fetchJson(`/api/cities/${slug}/summary`);
}

export function getCityEvents(slug: string, since?: number, until?: number): Promise<DisasterEvent[]> {
  let path = `/api/cities/${slug}/events`;
  const params: string[] = [];
  if (since !== undefined) params.push(`since=${since}`);
  if (until !== undefined) params.push(`until=${until}`);
  if (params.length) path += "?" + params.join("&");
  return fetchJson(path);
}

export function getCityProjection(slug: string): Promise<ProjectionResponse> {
  return fetchJson(`/api/cities/${slug}/projection`);
}

export function getCityCompounding(slug: string, nEvents = 4, since?: number, until?: number): Promise<CompoundingEvent[]> {
  let path = `/api/cities/${slug}/compounding?n_events=${nEvents}`;
  if (since !== undefined) path += `&since=${since}`;
  if (until !== undefined) path += `&until=${until}`;
  return fetchJson(path);
}

export function getCityInterventions(slug: string): Promise<Intervention[]> {
  return fetchJson(`/api/cities/${slug}/interventions?n=6`);
}

export function getCityDataFreshness(slug: string): Promise<{ path: string; label: string; last_updated: string; rows: number; source: string }[]> {
  return fetchJson(`/api/cities/${slug}/data-freshness`);
}

export function getCityZones(slug: string): Promise<ZoneData[]> {
  return fetchJson(`/api/cities/${slug}/zones`);
}

export function getReportUrl(slug: string): string {
  return `${API_BASE}/api/cities/${slug}/report`;
}

export function getCityInfrastructure(slug: string): Promise<InfrastructureProject[]> {
  return fetchJson(`/api/cities/${slug}/infrastructure`);
}

export function getCityPatternExplanation(slug: string): Promise<{ explanation: string }> {
  return fetchJson(`/api/cities/${slug}/pattern-explanation`);
}

export function getCityAffectedZones(slug: string): Promise<{ zones: string }> {
  return fetchJson(`/api/cities/${slug}/affected-zones`);
}

export function postRecommendations(
  slug: string,
  body: {
    next_event_cost_bn: number;
    total_historic_cost_bn: number;
    total_events: number;
    years_covered: string;
  }
): Promise<Intervention[]> {
  return fetchJson(`/api/cities/${slug}/recommendations`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postCityScenario(slug: string, body: {
  infra_investment_mn?: number;
  population_growth_pct?: number;
  reduction_pct?: number;
}): Promise<ScenarioResponse> {
  return fetchJson(`/api/cities/${slug}/scenario`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postPolicyBrief(
  slug: string,
  body: { next_event_cost_bn: number; recommendations: Intervention[] }
): Promise<{ brief: string }> {
  return fetchJson(`/api/cities/${slug}/policy-brief`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface HomelessYear {
  year: number;
  total: number;
  under_18: number;
  unsheltered: number;
}

export interface DisasterHomelessImpact {
  pre_disaster_year: number;
  pre_disaster_count: number;
  post_disaster_year: number;
  post_disaster_count: number;
  pct_increase: number;
  disaster: string;
  source: string;
  note?: string;
}

export function getCityHomelessness(slug: string): Promise<{
  trend: HomelessYear[];
  disaster_impact: DisasterHomelessImpact;
}> {
  return fetchJson(`/api/cities/${slug}/homelessness`);
}

export interface DamagePoint {
  lat: number;
  lon: number;
  dmg: "DES" | "MAJ" | "MIN" | "AFF";
  ws: string;
  depth: number;
  value: number;
  addr: string;
}

export function getHoustonDamageMap(): Promise<{
  count: number;
  total_properties: number;
  points: DamagePoint[];
}> {
  return fetchJson(`/api/cities/houston/damage-map`);
}

export interface Watershed {
  watershed: string;
  properties: number;
  major_destroyed: number;
  value_bn: number;
  avg_depth_ft: number;
}

export function getHoustonWatersheds(): Promise<Watershed[]> {
  return fetchJson(`/api/cities/houston/watersheds`);
}
