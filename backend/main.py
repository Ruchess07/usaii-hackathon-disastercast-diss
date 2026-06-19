"""
backend/main.py — FastAPI server wrapping disastercast Python utils.
Run: uvicorn backend.main:app --reload --port 8000
"""

import os
import sys
import json
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__))))

from utils.data_loader import (
    get_houston_data, get_la_data, get_city_summary,
    load_city_data, load_zone_data, load_population_data,
    load_infrastructure_data, load_interventions_db,
    get_affected_zones_summary, get_dataset_metadata,
)
from utils.cost_engine import (
    project_next_event_cost, compound_inaction_cost,
    prevention_savings, get_pattern_explanation,
    project_scenario_cost,
)
from utils.ai_engine import get_prevention_recommendations, get_policy_brief
from utils.rag_layer import retrieve_interventions
from utils.report_generator import generate_report_pdf

app = FastAPI(title="DisasterCast API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CITY_MAP = {
    "houston": {"name": "Houston", "disaster": "Flood"},
    "los-angeles": {"name": "Los Angeles", "disaster": "Wildfire"},
}

TOP_DAMAGE_DRIVERS = {
    "Houston": "undersized drainage infrastructure in Brays, Buffalo, and White Oak bayous combined with continued residential development in 100-year floodplain",
    "Los Angeles": "residential development in wildland-urban interface zones with inadequate vegetation management and aging power infrastructure on hillsides",
}


def _resolve_city(city_slug: str):
    info = CITY_MAP.get(city_slug)
    if not info:
        raise HTTPException(status_code=404, detail=f"Unknown city: {city_slug}")
    return info["name"], info["disaster"]


# -----------------------------------------------------------------------
# Pydantic models
# -----------------------------------------------------------------------

class RecommendationsRequest(BaseModel):
    next_event_cost_bn: float
    total_historic_cost_bn: float
    total_events: int
    years_covered: str
    top_damage_driver: Optional[str] = None


class PolicyBriefRequest(BaseModel):
    next_event_cost_bn: float
    recommendations: list


class ScenarioRequest(BaseModel):
    last_event_cost_bn: Optional[float] = None
    infra_investment_mn: float = 0
    population_growth_pct: Optional[float] = None
    reduction_pct: Optional[float] = None


# -----------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------

@app.get("/api/compare")
def compare_cities(cities: str = "houston,los-angeles"):
    slugs = [s.strip() for s in cities.split(",")]
    results = []
    for slug in slugs:
        try:
            name, disaster = _resolve_city(slug)
        except HTTPException:
            continue
        df = get_houston_data() if name == "Houston" else get_la_data()
        summary = get_city_summary(name)
        last_cost = df["total_damage_bn"].iloc[-1] if not df.empty else 1
        proj = project_next_event_cost(name, last_cost, 3)
        savings = prevention_savings(name, last_cost)
        interventions = retrieve_interventions(name, disaster, n=3)
        results.append({
            "slug": slug,
            "name": name,
            "disaster": disaster,
            "summary": summary,
            "projection": proj,
            "savings": savings,
            "top_interventions": interventions,
        })
    return results


@app.get("/api/cities")
def list_cities():
    return [
        {"slug": "houston", "name": "Houston, Texas", "disaster": "Flood"},
        {"slug": "los-angeles", "name": "Los Angeles, California", "disaster": "Wildfire"},
    ]


@app.get("/api/cities/{city_slug}/summary")
def city_summary(city_slug: str):
    city_name, _ = _resolve_city(city_slug)
    return get_city_summary(city_name)


@app.get("/api/cities/{city_slug}/events")
def city_events(city_slug: str, since: Optional[int] = None, until: Optional[int] = None):
    city_name, _ = _resolve_city(city_slug)
    df = get_houston_data() if city_name == "Houston" else get_la_data()
    if since is not None:
        df = df[df["year"] >= since]
    if until is not None:
        df = df[df["year"] <= until]
    return json.loads(df.to_json(orient="records", date_format="iso"))


@app.get("/api/cities/{city_slug}/zones")
def city_zones(city_slug: str):
    city_name, disaster = _resolve_city(city_slug)
    df = load_zone_data(city_name, disaster)
    return json.loads(df.to_json(orient="records"))


@app.get("/api/cities/{city_slug}/population")
def city_population(city_slug: str):
    city_name, disaster = _resolve_city(city_slug)
    df = load_population_data(city_name, disaster)
    return json.loads(df.to_json(orient="records"))


@app.get("/api/cities/{city_slug}/affected-zones")
def city_affected_zones(city_slug: str):
    city_name, _ = _resolve_city(city_slug)
    return {"zones": get_affected_zones_summary(city_name)}


@app.get("/api/cities/{city_slug}/data-freshness")
def city_data_freshness(city_slug: str):
    city_name, _ = _resolve_city(city_slug)
    return get_dataset_metadata(city_name)


from fastapi.responses import FileResponse

@app.get("/api/cities/{city_slug}/report")
def city_report(city_slug: str):
    city_name, disaster = _resolve_city(city_slug)
    df = get_houston_data() if city_name == "Houston" else get_la_data()
    summary = get_city_summary(city_name)
    last_cost = df["total_damage_bn"].iloc[-1] if not df.empty else 1
    proj = project_next_event_cost(city_name, last_cost, 3)
    interventions = retrieve_interventions(city_name, disaster, n=5)
    path = generate_report_pdf(city_name, disaster, summary, proj, interventions)
    return FileResponse(path, media_type="application/pdf",
                        filename=f"disastercast_{city_slug}_report.pdf")


@app.get("/api/cities/{city_slug}/infrastructure")
def city_infrastructure(city_slug: str):
    city_name, disaster = _resolve_city(city_slug)
    df = load_infrastructure_data(city_name, disaster)
    return json.loads(df.to_json(orient="records"))


@app.get("/api/cities/{city_slug}/projection")
def city_projection(city_slug: str):
    city_name, _ = _resolve_city(city_slug)
    df = get_houston_data() if city_name == "Houston" else get_la_data()
    last_cost = df["total_damage_bn"].iloc[-1] if not df.empty else 1
    proj = project_next_event_cost(city_name, last_cost, 3)
    savings = prevention_savings(city_name, last_cost)
    return {"projection": proj, "savings": savings}


@app.post("/api/cities/{city_slug}/scenario")
def city_scenario(city_slug: str, body: ScenarioRequest):
    city_name, _ = _resolve_city(city_slug)
    df = get_houston_data() if city_name == "Houston" else get_la_data()
    last_cost = body.last_event_cost_bn or (df["total_damage_bn"].iloc[-1] if not df.empty else 1)
    result = project_scenario_cost(
        city=city_name,
        last_event_cost_bn=last_cost,
        infra_investment_mn=body.infra_investment_mn,
        population_growth_pct=body.population_growth_pct,
        reduction_pct=body.reduction_pct,
    )
    return result


@app.get("/api/cities/{city_slug}/compounding")
def city_compounding(city_slug: str, n_events: int = 4,
                     since: Optional[int] = None, until: Optional[int] = None):
    city_name, _ = _resolve_city(city_slug)
    df = get_houston_data() if city_name == "Houston" else get_la_data()
    if since is not None:
        df = df[df["year"] >= since]
    if until is not None:
        df = df[df["year"] <= until]
    last_cost = df["total_damage_bn"].iloc[-1] if not df.empty else 1
    compound_df = compound_inaction_cost(city_name, last_cost, n_future_events=n_events)
    return json.loads(compound_df.to_json(orient="records"))


@app.get("/api/cities/{city_slug}/interventions")
def city_interventions(city_slug: str, n: int = 6):
    city_name, disaster = _resolve_city(city_slug)
    recs = retrieve_interventions(city_name, disaster, n=n)
    return recs


@app.get("/api/cities/{city_slug}/pattern-explanation")
def city_pattern_explanation(city_slug: str):
    city_name, _ = _resolve_city(city_slug)
    return {"explanation": get_pattern_explanation(city_name)}


@app.post("/api/cities/{city_slug}/recommendations")
def city_recommendations(city_slug: str, body: RecommendationsRequest):
    city_name, disaster = _resolve_city(city_slug)
    driver = body.top_damage_driver or TOP_DAMAGE_DRIVERS.get(city_name, "")
    recs = get_prevention_recommendations(
        city=city_name,
        disaster_type=disaster,
        next_event_cost_bn=body.next_event_cost_bn,
        total_historic_cost_bn=body.total_historic_cost_bn,
        total_events=body.total_events,
        years_covered=body.years_covered,
        top_damage_driver=driver,
    )
    return recs


@app.post("/api/cities/{city_slug}/policy-brief")
def city_policy_brief(city_slug: str, body: PolicyBriefRequest):
    city_name, disaster = _resolve_city(city_slug)
    brief = get_policy_brief(
        city=city_name,
        disaster_type=disaster,
        next_event_cost_bn=body.next_event_cost_bn,
        recommendations=body.recommendations,
    )
    return {"brief": brief}


@app.get("/api/glossary")
def glossary():
    """Returns plain-language definitions of disaster policy jargon terms."""
    from utils.ai_engine import get_glossary
    return get_glossary()


@app.get("/health")
def health():
    return {"status": "ok"}


# -----------------------------------------------------------------------
# Homelessness trend (real HUD PIT Count data)
# -----------------------------------------------------------------------

@app.get("/api/cities/{city_slug}/homelessness")
def city_homelessness(city_slug: str):
    city_name, _ = _resolve_city(city_slug)
    from utils.homelessness_data import get_homeless_trend, get_homeless_impact, get_all_disaster_events
    trend = get_homeless_trend(city_name)
    impact = get_homeless_impact(city_name)
    all_events = get_all_disaster_events(city_name)
    return {
        "trend": json.loads(trend.to_json(orient="records")),
        "disaster_impact": impact,
        "all_disaster_events": all_events,
    }


# -----------------------------------------------------------------------
# Harvey property damage map (real GeoJSON, Houston only)
# -----------------------------------------------------------------------

@app.get("/api/cities/houston/damage-map")
def houston_damage_map(sample: float = 1.0):
    """
    Returns Harvey property-level damage points for map rendering.
    sample: fraction of AFF/MIN points to include (0-1). DES/MAJ always included.
    Source: FEMA/HCAD Harvey merged dataset, 68,795 properties.
    """
    import random
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "harvey_damage_lite.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="harvey_damage_lite.json not found in data/")

    with open(path) as f:
        properties = json.load(f)

    show = []
    for p in properties:
        if p["dmg"] in ("DES", "MAJ"):
            show.append(p)
        elif p["dmg"] == "MIN" and random.random() < (0.3 * sample):
            show.append(p)
        elif p["dmg"] == "AFF" and random.random() < (0.1 * sample):
            show.append(p)

    return {"count": len(show), "total_properties": len(properties), "points": show}


@app.get("/api/cities/houston/watersheds")
def houston_watersheds():
    """Returns watershed-level damage summary from Harvey data."""
    return [
        {"watershed": "Greens Bayou",      "properties": 14759, "major_destroyed": 724,  "value_bn": 1.73, "avg_depth_ft": 2.0},
        {"watershed": "Cypress Creek",     "properties": 12010, "major_destroyed": 1308, "value_bn": 3.42, "avg_depth_ft": 2.4},
        {"watershed": "Buffalo Bayou",     "properties": 6867,  "major_destroyed": 2482, "value_bn": 8.51, "avg_depth_ft": 4.8},
        {"watershed": "Brays Bayou",       "properties": 6212,  "major_destroyed": 18,   "value_bn": 3.89, "avg_depth_ft": 1.1},
        {"watershed": "San Jacinto River", "properties": 5543,  "major_destroyed": 2863, "value_bn": 2.28, "avg_depth_ft": 6.0},
        {"watershed": "Addicks Reservoir", "properties": 4980,  "major_destroyed": 40,   "value_bn": 1.10, "avg_depth_ft": 1.4},
        {"watershed": "Clear Creek",       "properties": 4563,  "major_destroyed": 355,  "value_bn": 1.13, "avg_depth_ft": 1.8},
        {"watershed": "Cedar Bayou",       "properties": 3143,  "major_destroyed": 1052, "value_bn": 5.35, "avg_depth_ft": 4.5},
        {"watershed": "White Oak Bayou",   "properties": 2581,  "major_destroyed": 222,  "value_bn": 0.72, "avg_depth_ft": 1.9},
        {"watershed": "Hunting Bayou",     "properties": 1891,  "major_destroyed": 45,   "value_bn": 0.42, "avg_depth_ft": 1.5},
    ]
