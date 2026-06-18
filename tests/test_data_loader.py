from utils.data_loader import get_houston_data, get_la_data, get_city_summary


def test_houston_data_not_empty():
    df = get_houston_data()
    assert len(df) > 0


def test_la_data_not_empty():
    df = get_la_data()
    assert len(df) > 0


def test_houston_summary_has_required_keys():
    s = get_city_summary("Houston")
    for k in ("total_events", "total_damage_bn", "total_displaced",
              "escalation_rate_pct", "worst_event", "disaster_type"):
        assert k in s


def test_la_summary_has_required_keys():
    s = get_city_summary("Los Angeles")
    for k in ("total_events", "total_damage_bn", "total_displaced",
              "escalation_rate_pct", "worst_event", "disaster_type"):
        assert k in s


def test_houston_escalation_rate():
    s = get_city_summary("Houston")
    assert s["escalation_rate_pct"] == 14.5


def test_la_escalation_rate():
    s = get_city_summary("Los Angeles")
    assert s["escalation_rate_pct"] == 29.7
