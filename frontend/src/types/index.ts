export interface City {
  slug: string;
  name: string;
  disaster: string;
}

export interface CitySummary {
  total_events: number;
  total_damage_bn: number;
  total_displaced: number;
  avg_renter_pct: number;
  escalation_rate_pct: number;
  worst_event: string;
  disaster_type: string;
  years_covered: string;
  data_sources: string;
}

export interface DisasterEvent {
  event_id: string;
  event_name: string;
  year: number;
  total_damage_bn: number;
  total_damage_usd: number;
  infrastructure_cost: number;
  total_displaced: number;
  renter_pct: number;
  incident_begin: string;
  incident_end: string;
  disaster_type: string;
  affected_zones: string;
}

export interface ZoneData {
  event_year?: number;
  zone_name?: string;
  neighborhood?: string;
  damage_usd: number;
  damage_bn: number;
  population: number;
  structures_damaged?: number;
  structures_destroyed?: number;
}

export interface CostProjection {
  direct_damage_bn: number;
  displacement_cost_mn: number;
  displacement_source: string;
  est_displaced: number;
  healthcare_cost_mn: number;
  healthcare_source: string;
  school_days_lost: number;
  school_cost_mn: number;
  school_source: string;
  lost_wages_mn: number;
  wages_source: string;
  homelessness_source: string;
  total_social_cost_mn: number;
  total_projected_cost_bn: number;
}

export interface Savings {
  next_event_cost_bn: number;
  prevented_cost_bn: number;
  reduction_pct: number;
}

export interface ProjectionResponse {
  projection: CostProjection;
  savings: Savings;
}

export interface CompoundingEvent {
  event_number: string;
  approx_year: number;
  direct_damage_bn: number;
  total_cost_bn: number;
  displaced: number;
}

export interface Intervention {
  rank: number;
  action: string;
  detail: string;
  estimated_cost_mn: number;
  projected_saving_mn: number;
  roi: string;
  evidence: string;
  affected_zone?: string;
}

export interface PatternExplanation {
  explanation: string;
}

export interface InfrastructureProject {
  year: number;
  project_name: string;
  capacity_pct: number;
  status: string;
  description: string;
}

export interface ScenarioParams {
  infra_investment_mn: number;
  population_growth_pct: number | null;
  reduction_pct: number | null;
  infra_reduction_pct: number;
  total_reduction_pct: number;
}

export interface ScenarioResponse {
  base_case: CostProjection;
  scenario: CostProjection;
  difference_bn: number;
  scenario_params: ScenarioParams;
}
