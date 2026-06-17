"""
cost_engine.py
Computes:
1. Projected cost of the next disaster given nothing has changed
2. Compounding cost over multiple future events if no action is taken

Logic is based on observed cost escalation patterns from FEMA/CalFire data.
"""

import numpy as np
import pandas as pd


# Cost escalation factors observed from historic data
# Houston: costs have grown ~3.5x per decade due to population density
#          in vulnerable zones increasing without drainage upgrades
# LA:      costs have grown ~8x per decade due to WUI expansion +
#          vegetation management failures
# Real rates derived from FEMA data analysis (see data_loader.py)
ESCALATION_RATES = {
    "Houston": 0.145,  # 14.5%/yr — derived from FEMA data 2019-2024 trend
    "Los Angeles": 0.297,  # 29.7%/yr — derived from FEMA data 2018-2025 trend
}

# Average years between significant events
EVENT_FREQUENCY = {
    "Houston": 3.5,    # major flood every ~3.5 years
    "Los Angeles": 2.0,  # major wildfire every ~2 years
}

# Social cost multipliers per $1 of direct damage
# (displacement, healthcare, education, lost wages)
SOCIAL_MULTIPLIERS = {
    "Houston": {
        "displacement_cost_per_person_per_month": 2800,   # FEMA rental assistance data
        "avg_displacement_months": 4.2,
        "healthcare_pct_of_damage": 0.022,
        "school_days_cost_per_day": 850000,               # Harris County school system
        "lost_wages_pct_of_damage": 0.048,
    },
    "Los Angeles": {
        "displacement_cost_per_person_per_month": 3900,   # LA County housing costs
        "avg_displacement_months": 5.8,
        "healthcare_pct_of_damage": 0.023,
        "school_days_cost_per_day": 1200000,              # LAUSD per-day cost
        "lost_wages_pct_of_damage": 0.065,
    },
}


def project_next_event_cost(city: str, last_event_cost_bn: float,
                             years_since_last: int) -> dict:
    """
    Projects the cost of the next event if nothing changes.
    Applies observed escalation rate adjusted for time since last event.
    """
    rate = ESCALATION_RATES[city]
    # Cost grows with each passing year of inaction
    escalation_factor = (1 + rate) ** years_since_last
    projected_direct_bn = round(last_event_cost_bn * escalation_factor, 2)

    mult = SOCIAL_MULTIPLIERS[city]
    # Estimate displaced people proportionally
    if city == "Houston":
        est_displaced = int(projected_direct_bn * 2400)
    else:
        est_displaced = int(projected_direct_bn * 3800)

    displacement_cost_mn = round(
        est_displaced * mult["displacement_cost_per_person_per_month"]
        * mult["avg_displacement_months"] / 1_000_000, 1
    )
    healthcare_cost_mn = round(
        projected_direct_bn * 1000 * mult["healthcare_pct_of_damage"], 1
    )
    school_days = int(projected_direct_bn * 0.17)
    school_cost_mn = round(
        school_days * mult["school_days_cost_per_day"] / 1_000_000, 1
    )
    lost_wages_mn = round(
        projected_direct_bn * 1000 * mult["lost_wages_pct_of_damage"], 1
    )

    total_social_mn = displacement_cost_mn + healthcare_cost_mn + \
        school_cost_mn + lost_wages_mn
    total_bn = round(projected_direct_bn + total_social_mn / 1000, 2)

    return {
        "direct_damage_bn": projected_direct_bn,
        "displacement_cost_mn": displacement_cost_mn,
        "est_displaced": est_displaced,
        "healthcare_cost_mn": healthcare_cost_mn,
        "school_days_lost": school_days,
        "school_cost_mn": school_cost_mn,
        "lost_wages_mn": lost_wages_mn,
        "total_social_cost_mn": total_social_mn,
        "total_projected_cost_bn": total_bn,
    }


def compound_inaction_cost(city: str, last_event_cost_bn: float,
                            n_future_events: int = 4) -> pd.DataFrame:
    """
    Projects costs across multiple future events assuming no action taken.
    Returns a dataframe showing compounding costs event by event.
    """
    freq = EVENT_FREQUENCY[city]
    rate = ESCALATION_RATES[city]
    rows = []
    cost = last_event_cost_bn

    for i in range(1, n_future_events + 1):
        cost = round(cost * (1 + rate) ** freq, 2)
        proj = project_next_event_cost(city, cost, int(freq))
        rows.append({
            "event_number": f"Event {i}",
            "approx_year": 2025 + int(i * freq),
            "direct_damage_bn": proj["direct_damage_bn"],
            "total_cost_bn": proj["total_projected_cost_bn"],
            "displaced": proj["est_displaced"],
        })

    return pd.DataFrame(rows)


def prevention_savings(city: str, last_event_cost_bn: float,
                       reduction_pct: float = 0.60) -> dict:
    """
    Estimates savings from prevention investment vs doing nothing.
    Industry evidence: well-targeted mitigation reduces future
    disaster costs by 50-75% (FEMA Hazard Mitigation Grant data).
    Default 60% reduction is conservative mid-estimate.
    """
    next_event = project_next_event_cost(city, last_event_cost_bn, 3)
    prevented_cost_bn = round(
        next_event["total_projected_cost_bn"] * reduction_pct, 2
    )
    return {
        "next_event_cost_bn": next_event["total_projected_cost_bn"],
        "prevented_cost_bn": prevented_cost_bn,
        "reduction_pct": int(reduction_pct * 100),
    }
