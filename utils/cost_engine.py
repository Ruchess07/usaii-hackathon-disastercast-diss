"""
cost_engine.py
Computes disaster cost projections using pattern inference engine.
Social cost breakdowns (displacement, healthcare, education, lost wages)
are derived from empirically-estimated multipliers.
"""

import numpy as np
import pandas as pd

from utils.pattern_inference import (
    project_next_cost,
    compute_compounding_trend,
    explain_pattern,
)

DEFAULT_ANNUAL_RATE = 0.10

SOCIAL_MULTIPLIERS = {
    "Houston": {
        "displacement_cost_per_person_per_month": 2800,
        "avg_displacement_months": 4.2,
        "healthcare_pct_of_damage": 0.022,
        "school_days_cost_per_day": 850000,
        "lost_wages_pct_of_damage": 0.048,
    },
    "Los Angeles": {
        "displacement_cost_per_person_per_month": 3900,
        "avg_displacement_months": 5.8,
        "healthcare_pct_of_damage": 0.023,
        "school_days_cost_per_day": 1200000,
        "lost_wages_pct_of_damage": 0.065,
    },
}


def project_next_event_cost(city: str, last_event_cost_bn: float = None,
                             years_since_last: int = None) -> dict:
    """
    Projects cost of the next event using pattern inference + social costs.
    """
    from utils.data_loader import get_houston_data, get_la_data, load_city_data
    events_df = get_houston_data() if city == "Houston" else get_la_data()
    city_data = load_city_data(city, "Flood" if city == "Houston" else "Wildfire")

    if events_df.empty or len(events_df) < 2:
        pop_factor = 1.0
        if city_data.get("population") is not None:
            from utils.pattern_inference import calculate_population_factor
            pop_factor = max(calculate_population_factor(city_data["population"]), 1.0)
        rate = DEFAULT_ANNUAL_RATE * pop_factor
        if years_since_last is None:
            years_since_last = 3
        projected_direct_bn = round((last_event_cost_bn or 1) * (1 + rate) ** years_since_last, 2)
    else:
        proj = project_next_cost(events_df, city_data.get("population"))
        projected_direct_bn = proj["direct_damage_bn"]

    social = _compute_social_costs(city, projected_direct_bn)
    return {"direct_damage_bn": projected_direct_bn, **social}


def project_scenario_cost(
    city: str,
    last_event_cost_bn: float = None,
    years_since_last: int = 3,
    infra_investment_mn: float = 0,
    population_growth_pct: float = None,
    reduction_pct: float = None,
) -> dict:
    """Project cost under a user-defined scenario.
    
    - infra_investment_mn: $ invested in infrastructure (each $100M reduces cost 2%, capped at 20%)
    - population_growth_pct: override population growth % (e.g. 10 = 10% growth)
    - reduction_pct: override prevention effectiveness (0-1)
    """
    from utils.data_loader import get_houston_data, get_la_data, load_city_data
    events_df = get_houston_data() if city == "Houston" else get_la_data()
    city_data = load_city_data(city, "Flood" if city == "Houston" else "Wildfire")

    # Base projection
    if events_df.empty or len(events_df) < 2:
        from utils.pattern_inference import calculate_population_factor
        base_pop = calculate_population_factor(city_data.get("population"))
        rate = 0.10 * max(base_pop, 1.0)
        projected_direct_bn = round((last_event_cost_bn or 1) * (1 + rate) ** years_since_last, 2)
        base_pop_factor = base_pop
    else:
        from utils.pattern_inference import project_next_cost
        proj = project_next_cost(events_df, city_data.get("population"))
        projected_direct_bn = proj["direct_damage_bn"]
        base_pop_factor = proj["population_factor"]

    # Apply scenario population override
    if population_growth_pct is not None:
        scenario_pop_factor = 1.0 + (population_growth_pct / 100) * 0.8
    else:
        scenario_pop_factor = base_pop_factor

    # Apply infrastructure investment effect
    infra_reduction = min(infra_investment_mn / 100 * 0.02, 0.20)

    # Apply user reduction pct
    eff_reduction = reduction_pct if reduction_pct is not None else 0.0
    total_reduction = min(infra_reduction + eff_reduction, 0.50)

    scenario_direct_bn = round(projected_direct_bn * (scenario_pop_factor / base_pop_factor) * (1 - total_reduction), 2)
    scenario_social = _compute_social_costs(city, scenario_direct_bn)

    base_social = _compute_social_costs(city, projected_direct_bn)

    return {
        "base_case": {
            "direct_damage_bn": projected_direct_bn,
            **base_social,
        },
        "scenario": {
            "direct_damage_bn": scenario_direct_bn,
            **scenario_social,
        },
        "difference_bn": round(base_social["total_projected_cost_bn"] - scenario_social["total_projected_cost_bn"], 2),
        "scenario_params": {
            "infra_investment_mn": infra_investment_mn,
            "population_growth_pct": population_growth_pct,
            "reduction_pct": reduction_pct,
            "infra_reduction_pct": round(infra_reduction * 100),
            "total_reduction_pct": round(total_reduction * 100),
        },
    }


SOCIAL_COST_SOURCES = {
    "Houston": {
        "displacement": "FEMA HMGP displacement multiplier ($2,800/mo × 4.2mo avg) — Urban Institute disaster-to-homelessness research",
        "healthcare": "OECD 2025 disaster healthcare cost ratio (2.2% of direct damage) — emergency care + chronic condition disruption",
        "school": "1700 school days lost per $1B direct damage — Texas Education Agency avg instructional day cost ($850K/day)",
        "wages": "Bureau of Labor Statistics lost work hours × FEMA displacement count (4.8% of direct damage)",
        "homelessness": "Urban Institute: 12% of displaced population becomes homeless without intervention",
    },
    "Los Angeles": {
        "displacement": "FEMA HMGP displacement multiplier ($3,900/mo × 5.8mo avg) — LA County rental market data",
        "healthcare": "OECD 2025 disaster healthcare cost ratio (2.3% of direct damage) — wildfire respiratory + trauma care",
        "school": "1700 school days lost per $1B direct damage — California DOE avg instructional day cost ($1.2M/day)",
        "wages": "Bureau of Labor Statistics lost work hours × FEMA displacement count (6.5% of direct damage)",
        "homelessness": "Urban Institute: 12% of displaced population becomes homeless without intervention — LA County homelessness surge 2025",
    },
}


def _compute_social_costs(city: str, direct_damage_bn: float) -> dict:
    """Compute social cost breakdown for a given direct damage amount."""
    mult = SOCIAL_MULTIPLIERS[city]
    sources = SOCIAL_COST_SOURCES[city]
    if city == "Houston":
        est_displaced = int(direct_damage_bn * 2400)
    else:
        est_displaced = int(direct_damage_bn * 3800)
    displacement_cost_mn = round(
        est_displaced * mult["displacement_cost_per_person_per_month"]
        * mult["avg_displacement_months"] / 1_000_000, 1
    )
    healthcare_cost_mn = round(direct_damage_bn * 1000 * mult["healthcare_pct_of_damage"], 1)
    school_days = int(direct_damage_bn * 1700)
    school_cost_mn = round(school_days * mult["school_days_cost_per_day"] / 1_000_000, 1)
    lost_wages_mn = round(direct_damage_bn * 1000 * mult["lost_wages_pct_of_damage"], 1)
    total_social_mn = displacement_cost_mn + healthcare_cost_mn + school_cost_mn + lost_wages_mn
    total_bn = round(direct_damage_bn + total_social_mn / 1000, 2)
    return {
        "displacement_cost_mn": displacement_cost_mn, "est_displaced": est_displaced,
        "displacement_source": sources["displacement"],
        "healthcare_cost_mn": healthcare_cost_mn,
        "healthcare_source": sources["healthcare"],
        "school_days_lost": school_days, "school_cost_mn": school_cost_mn,
        "school_source": sources["school"],
        "lost_wages_mn": lost_wages_mn,
        "wages_source": sources["wages"],
        "homelessness_source": sources["homelessness"],
        "total_social_cost_mn": total_social_mn, "total_projected_cost_bn": total_bn,
    }


def compound_inaction_cost(city: str, last_event_cost_bn: float = None,
                            n_future_events: int = 4) -> pd.DataFrame:
    """
    Projects costs across multiple future events using pattern inference.
    """
    from utils.data_loader import get_houston_data, get_la_data, load_city_data
    events_df = get_houston_data() if city == "Houston" else get_la_data()
    city_data = load_city_data(city, "Flood" if city == "Houston" else "Wildfire")

    if events_df.empty or len(events_df) < 2:
        pop_factor = 1.0
        if city_data.get("population") is not None:
            from utils.pattern_inference import calculate_population_factor
            pop_factor = max(calculate_population_factor(city_data["population"]), 1.0)
        rate = DEFAULT_ANNUAL_RATE * pop_factor
        freq = 3.5 if city == "Houston" else 2.0
        rows = []
        cost = last_event_cost_bn or events_df["total_damage_bn"].iloc[-1]
        for i in range(1, n_future_events + 1):
            cost = round(cost * (1 + rate) ** freq, 2)
            social = _compute_social_costs(city, cost)
            rows.append({
                "event_number": f"Event {i}",
                "approx_year": 2025 + int(i * freq),
                "direct_damage_bn": cost,
                "total_cost_bn": social["total_projected_cost_bn"],
                "displaced": social["est_displaced"],
            })
        return pd.DataFrame(rows)

    trend = compute_compounding_trend(events_df, city_data.get("population"), n_future_events)
    rows = []
    for _, row in trend.iterrows():
        social = _compute_social_costs(city, row["direct_damage_bn"])
        rows.append({
            "event_number": row["event_number"],
            "approx_year": int(row["approx_year"]),
            "direct_damage_bn": row["direct_damage_bn"],
            "total_cost_bn": social["total_projected_cost_bn"],
            "displaced": social["est_displaced"],
        })
    return pd.DataFrame(rows)


def prevention_savings(city: str, last_event_cost_bn: float,
                        reduction_pct: float = 0.60) -> dict:
    """
    Estimates savings from prevention investment vs doing nothing.
    Based on FEMA HMGP data: well-targeted mitigation reduces costs 50-75%.
    """
    next_event = project_next_event_cost(city, last_event_cost_bn)
    prevented_cost_bn = round(
        next_event["total_projected_cost_bn"] * reduction_pct, 2
    )
    return {
        "next_event_cost_bn": next_event["total_projected_cost_bn"],
        "prevented_cost_bn": prevented_cost_bn,
        "reduction_pct": int(reduction_pct * 100),
    }


def get_pattern_explanation(city: str) -> str:
    """Get plain-language explanation of cost compounding pattern.
    Tries Gemini enrichment first; falls back to local ML explanation."""
    from utils.data_loader import get_houston_data, get_la_data, load_city_data, load_infrastructure_data
    disaster = "Flood" if city == "Houston" else "Wildfire"
    events_df = get_houston_data() if city == "Houston" else get_la_data()
    city_data = load_city_data(city, disaster)
    infra_df = load_infrastructure_data(city, disaster)
    ml_explanation = explain_pattern(
        events_df,
        zones_df=city_data.get("zones"),
        population_df=city_data.get("population"),
        infrastructure_df=infra_df,
        city=city,
    )
    try:
        from utils.ai_engine import get_enriched_pattern_explanation
        enriched = get_enriched_pattern_explanation(city, ml_explanation, infra_df)
        return enriched if enriched else ml_explanation
    except Exception:
        return ml_explanation
