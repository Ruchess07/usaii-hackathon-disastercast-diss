"""
rag_layer.py
Retrieves evidence-based interventions from the interventions database
to ground AI recommendations in real FEMA HMGP outcomes.
"""

import os
import pandas as pd
from utils.data_loader import load_interventions_db, DATA_ROOT


def retrieve_policy_evidence(city: str, intervention_type: str = None) -> list[dict]:
    """
    Load FEMA Hazard Mitigation Grant Program records to find real-world
    evidence for a given intervention type in a given city.
    Requires a CSV of FEMA HMGP project-level data at:
      data/processed/fema_hmgp_projects.csv
    with columns: city, intervention_type, project_description, cost,
                  damage_reduction, roi, source, year_implemented, actual_outcome
    Returns empty list if the dataset is not available.
    """
    path = os.path.join(DATA_ROOT, "processed", "fema_hmgp_projects.csv")
    if not os.path.exists(path):
        return []
    df = pd.read_csv(path)
    if city:
        df = df[df["city"] == city]
    if intervention_type and "intervention_type" in df.columns:
        df = df[df["intervention_type"] == intervention_type]
    results = []
    for _, row in df.iterrows():
        results.append({
            "city": row.get("city", city),
            "intervention_type": row.get("intervention_type", intervention_type or ""),
            "description": row.get("project_description", ""),
            "cost_usd": row.get("cost", 0),
            "damage_reduction_usd": row.get("damage_reduction", 0),
            "roi": row.get("roi", 0),
            "source": row.get("source", ""),
            "year_implemented": row.get("year_implemented", ""),
            "actual_outcome": row.get("actual_outcome", ""),
        })
    return results


def retrieve_interventions(city: str, disaster_type: str = None,
                            n: int = 5) -> list[dict]:
    """
    Retrieve top-N interventions for a city, sorted by ROI.
    This is the core RAG retrieval: filter -> sort by ROI -> return.
    """
    df = load_interventions_db(city)
    if df.empty:
        return []

    if disaster_type and "disaster_type" in df.columns:
        df = df[df["disaster_type"] == disaster_type]

    if df.empty:
        return []

    # Sort by ROI descending
    df = df.sort_values("roi_ratio", ascending=False)

    top = df.head(n)

    results = []
    for _, row in top.iterrows():
        cost_m = float(row["estimated_cost_usd"]) / 1e6
        saving_m = float(row["estimated_damage_reduction_usd"]) / 1e6
        roi = float(row["roi_ratio"])

        results.append({
            "rank": len(results) + 1,
            "action": row["intervention_name"],
            "detail": row["description"],
            "estimated_cost_mn": round(cost_m, 1),
            "projected_saving_mn": round(saving_m, 1),
            "roi": f"{roi:.1f}x return",
            "evidence": row["actual_outcome"] if row["actual_outcome"] and row["actual_outcome"] != "N/A" else row["source"],
        })

    return results


def build_rag_context(city: str, disaster_type: str, interventions: list[dict]) -> str:
    """
    Build a structured text block for Gemini prompts from intervention data.
    Includes city infrastructure context, intervention details, and evidence.
    """
    lines = [f"City: {city}", f"Disaster type: {disaster_type}", ""]
    if interventions:
        lines.append("INTERVENTIONS (ranked by ROI):")
        for r in interventions:
            lines.append(
                f"- {r.get('action', '?')}: ${r.get('estimated_cost_mn', 0)}M cost, "
                f"${r.get('projected_saving_mn', 0)}M saving, {r.get('roi', '?')}. "
                f"Detail: {r.get('detail', '')}. Evidence: {r.get('evidence', '')}"
            )
    return "\n".join(lines)


def get_policy_evidence_context(city: str) -> str:
    """
    Build a context string from the interventions DB evidence
    for enriching the AI prompt.
    """
    interventions = retrieve_interventions(city, n=6)
    if not interventions:
        return ""

    lines = []
    for r in interventions:
        lines.append(f"- {r['action']}: ${r['estimated_cost_mn']:.0f}M cost, "
                     f"${r['projected_saving_mn']:.0f}M saving, "
                     f"{r['roi']}. Evidence: {r['evidence']}")

    return "\n".join(lines)
