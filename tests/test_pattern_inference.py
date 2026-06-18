import pandas as pd
from utils.pattern_inference import (
    fit_trend_model, calculate_population_factor,
    project_next_cost, explain_pattern,
)


def test_fit_trend_model_returns_model():
    df = pd.DataFrame({
        "year": [2016, 2018, 2020, 2025],
        "total_damage_bn": [1.59, 4.72, 3.51, 128.6],
    })
    model = fit_trend_model(df)
    assert hasattr(model, "coef_")
    assert model.coef_[0] != 0


def test_calculate_population_factor_returns_at_least_one():
    df = pd.DataFrame({
        "year": [2000, 2000, 2020, 2020],
        "zone_name": ["A", "B", "A", "B"],
        "population": [100, 200, 150, 300],
        "growth_rate_pct": [2.0, 2.0, 1.5, 1.5],
    })
    factor = calculate_population_factor(df)
    assert factor >= 1.0


def test_calculate_population_factor_empty():
    assert calculate_population_factor(None) == 1.0
    assert calculate_population_factor(pd.DataFrame()) == 1.0


def test_project_next_cost_returns_expected_keys():
    df = pd.DataFrame({
        "year": [2016, 2018, 2020, 2025],
        "total_damage_bn": [1.59, 4.72, 3.51, 128.6],
    })
    result = project_next_cost(df)
    for k in ("direct_damage_bn", "trend_rate", "population_factor",
              "next_event_year", "avg_gap_years"):
        assert k in result
    assert result["direct_damage_bn"] > 0


def test_explain_pattern_returns_string():
    df = pd.DataFrame({
        "year": [2016, 2018],
        "total_damage_bn": [1.59, 4.72],
        "disaster_type": ["Flood", "Flood"],
    })
    text = explain_pattern(df, city="Houston")
    assert isinstance(text, str)
    assert len(text) > 50
