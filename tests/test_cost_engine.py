import pytest
from utils.cost_engine import (
    _compute_social_costs, project_next_event_cost,
    prevention_savings, compound_inaction_cost,
)


@pytest.mark.parametrize("city", ["Houston", "Los Angeles"])
def test_project_next_event_cost_shape(city):
    result = project_next_event_cost(city, last_event_cost_bn=10, years_since_last=3)
    assert "direct_damage_bn" in result
    assert "total_projected_cost_bn" in result
    assert "est_displaced" in result
    assert result["direct_damage_bn"] > 0
    assert result["total_projected_cost_bn"] > result["direct_damage_bn"]


@pytest.mark.parametrize("city", ["Houston", "Los Angeles"])
def test_social_costs_displacement_proportional(city):
    costs = _compute_social_costs(city, 10.0)
    assert costs["est_displaced"] > 0
    assert costs["displacement_cost_mn"] > 0
    assert costs["healthcare_cost_mn"] > 0
    assert costs["lost_wages_mn"] > 0


def test_social_costs_higher_for_larger_damage():
    small = _compute_social_costs("Houston", 1.0)
    large = _compute_social_costs("Houston", 10.0)
    assert large["total_projected_cost_bn"] > small["total_projected_cost_bn"]
    assert large["est_displaced"] > small["est_displaced"]


def test_prevention_savings_reduction():
    savings = prevention_savings("Houston", 10.0, reduction_pct=0.5)
    assert savings["reduction_pct"] == 50
    assert savings["prevented_cost_bn"] > 0
    assert savings["prevented_cost_bn"] < savings["next_event_cost_bn"]


@pytest.mark.parametrize("city", ["Houston", "Los Angeles"])
def test_compound_inaction_cost_returns_four_events(city):
    df = compound_inaction_cost(city, last_event_cost_bn=10, n_future_events=4)
    assert len(df) == 4
    assert list(df.columns) == ["event_number", "approx_year", "direct_damage_bn",
                                 "total_cost_bn", "displaced"]
    # Costs should escalate
    assert df["direct_damage_bn"].iloc[-1] >= df["direct_damage_bn"].iloc[0]
