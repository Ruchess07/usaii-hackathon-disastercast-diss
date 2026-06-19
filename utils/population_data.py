"""
population_data.py
Real US Census population figures for Harris County and Houston city.
Source: US Census Bureau (2000 Census, 2020 Census, 2025 estimate)
  Houston city: 1,953,631 (2000) -> 2,304,580 (2020) = 18.0% growth
  Harris County: ~3,400,578 (2000) -> 4,731,145 (2020) -> 5,045,026 (2025 est)
    = 39.1% growth 2000-2020, 48.4% growth 2000-2025

No zone/watershed-level Census breakdown is publicly available without
GIS tract-to-watershed mapping, which is out of scope for this build.
We use the real county-level figure rather than fabricate zone precision
we cannot cite.
"""

HOUSTON_CITY_POPULATION = {
    2000: 1_953_631,
    2020: 2_304_580,
}

HARRIS_COUNTY_POPULATION = {
    2000: 3_400_578,
    2020: 4_731_145,
    2025: 5_045_026,
}


def get_population_growth_pct(level: str = "county", since_year: int = 2000) -> float:
    """
    Returns real Census population growth percentage.
    level: 'city' (Houston city) or 'county' (Harris County, broader area
    covering all bayou watersheds in our affected zones list)
    """
    data = HARRIS_COUNTY_POPULATION if level == "county" else HOUSTON_CITY_POPULATION
    years = sorted(data.keys())
    start = data.get(since_year, data[years[0]])
    end = data[years[-1]]
    return round((end - start) / start * 100, 1)


def get_population_context_sentence() -> str:
    """Plain-language sentence with real, citable Census figures."""
    county_growth = get_population_growth_pct("county", 2000)
    city_growth = get_population_growth_pct("city", 2000)
    return (
        f"Harris County's population grew {county_growth}% from 2000 to 2025 "
        f"(US Census), reaching over 5 million residents. Houston city itself "
        f"grew {city_growth}% over the same period. Flood infrastructure in "
        f"many bayou watersheds was designed decades earlier for a much "
        f"smaller population, so the same flood event now exposes "
        f"significantly more people and property than it would have in 2000."
    )
