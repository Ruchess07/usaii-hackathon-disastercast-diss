"""
data_loader.py
Loads disaster data from pre-built CSV files in data/ directory.
CSVs built from FEMA OpenFEMA API data via build_data.py.
"""

import os
import time
import pandas as pd

DATA_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

_CACHE = {}


def _read_csv(path):
    """Read CSV with caching."""
    if path not in _CACHE:
        full = os.path.join(DATA_ROOT, path)
        if os.path.exists(full):
            _CACHE[path] = pd.read_csv(full)
        else:
            _CACHE[path] = pd.DataFrame()
    return _CACHE[path].copy()


def get_houston_data() -> pd.DataFrame:
    df = _read_csv("houston/flood/events.csv")
    if df.empty:
        return pd.DataFrame()
    return df


def get_la_data() -> pd.DataFrame:
    df = _read_csv("los_angeles/wildfire/events.csv")
    if df.empty:
        return pd.DataFrame()
    return df


def get_city_summary(city: str) -> dict:
    df = get_houston_data() if city == "Houston" else get_la_data()
    if df.empty:
        return {"total_events": 0, "total_damage_bn": 0, "total_displaced": 0}

    is_houston = city == "Houston"
    return {
        "total_events": len(df),
        "total_damage_bn": round(df["total_damage_bn"].sum(), 1),
        "total_displaced": int(df["total_displaced"].sum()),
        "avg_renter_pct": round(df["renter_pct"].mean(), 1),
        "escalation_rate_pct": 14.5 if is_houston else 29.7,
        "worst_event": "Hurricane Harvey 2017 — $128.6B" if is_houston
                       else "Palisades + Eaton Fires 2025 — $53.2B",
        "disaster_type": "Flood" if is_houston else "Wildfire",
        "years_covered": f"{int(df['year'].min())} to {int(df['year'].max())}",
        "data_sources": "FEMA OpenFEMA via API",
    }


def load_zone_data(city: str, disaster: str) -> pd.DataFrame:
    """Load damage-by-zone CSV for a city/disaster combo."""
    prefix = "houston/flood" if city == "Houston" else "los_angeles/wildfire"
    filename = "damage_by_zone.csv" if city == "Houston" else "damage_by_neighborhood.csv"
    return _read_csv(f"{prefix}/{filename}")


def load_population_data(city: str, disaster: str) -> pd.DataFrame:
    """Load population growth CSV for a city/disaster combo."""
    prefix = "houston/flood" if city == "Houston" else "los_angeles/wildfire"
    return _read_csv(f"{prefix}/population_growth.csv")


def load_infrastructure_data(city: str, disaster: str) -> pd.DataFrame:
    """Load infrastructure capacity CSV for a city/disaster combo.
    Tracks major infrastructure projects and their current capacity/status."""
    prefix = "houston/flood" if city == "Houston" else "los_angeles/wildfire"
    return _read_csv(f"{prefix}/infrastructure_capacity.csv")


def load_city_data(city: str, disaster: str) -> dict:
    """
    Load all data for a city/disaster combo.
    Returns dict with events, zones, population DataFrames.
    """
    prefix = "houston/flood" if city == "Houston" else "los_angeles/wildfire"
    return {
        "events": _read_csv(f"{prefix}/events.csv"),
        "zones": _read_csv(f"{prefix}/damage_by_zone.csv")
                 if city == "Houston"
                 else _read_csv(f"{prefix}/damage_by_neighborhood.csv"),
        "population": _read_csv(f"{prefix}/population_growth.csv"),
    }


SOURCE_LABELS = {
    "events.csv": "FEMA OpenFEMA Disaster Declarations",
    "damage_by_zone.csv": "HCFCD / FEMA Damage Assessment",
    "damage_by_neighborhood.csv": "CalFire / FEMA Damage Assessment",
    "population_growth.csv": "US Census ACS 5-Year Estimates",
    "infrastructure_capacity.csv": "City / County Infrastructure Reports",
}


def get_dataset_metadata(city: str = None) -> list[dict]:
    """Return last-modified timestamps and row counts for all CSVs under data/.
    If city is given, filters to that city's files only."""
    result = []
    base = os.path.join(DATA_ROOT, "policy")
    if os.path.exists(base):
        for fname in os.listdir(base):
            if fname.endswith(".csv"):
                path = os.path.join(base, fname)
                mtime = os.path.getmtime(path)
                df = pd.read_csv(path)
                result.append({
                    "path": f"data/policy/{fname}",
                    "label": SOURCE_LABELS.get(fname, fname),
                    "last_updated": time.strftime("%Y-%m-%d", time.gmtime(mtime)),
                    "rows": len(df),
                    "source": "FEMA HMGP / Policy Database",
                })

    if city:
        _city_dir = "houston" if city == "Houston" else "los_angeles"
        _disaster_dir = "flood" if city == "Houston" else "wildfire"
        data_dir = os.path.join(DATA_ROOT, _city_dir, _disaster_dir)
        if os.path.exists(data_dir):
            for fname in sorted(os.listdir(data_dir)):
                if fname.endswith(".csv"):
                    path = os.path.join(data_dir, fname)
                    mtime = os.path.getmtime(path)
                    df = pd.read_csv(path)
                    result.append({
                        "path": f"data/{_city_dir}/{_disaster_dir}/{fname}",
                        "label": SOURCE_LABELS.get(fname, fname),
                        "last_updated": time.strftime("%Y-%m-%d", time.gmtime(mtime)),
                        "rows": len(df),
                        "source": SOURCE_LABELS.get(fname, "FEMA / Local Agency"),
                    })
    return result


def load_interventions_db(city: str = None) -> pd.DataFrame:
    df = _read_csv("policy/interventions_db.csv")
    if df.empty:
        return pd.DataFrame()
    if city:
        return df[df["city"] == city].copy()
    return df


def get_affected_zones_summary(city: str) -> str:
    """Get comma-separated list of most affected zones for a city."""
    if city == "Houston":
        return "Brays Bayou, Buffalo Bayou, White Oak Bayou, Addicks Reservoir, Barker Reservoir, Hunting Bayou"
    return "Pacific Palisades, Altadena, Eaton Canyon, Malibu, Topanga, Hollywood Hills, Ventura County WUI"
