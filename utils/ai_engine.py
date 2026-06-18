"""
ai_engine.py
Uses GROQ API (OpenAI-compatible) to enrich RAG-retrieved interventions with
location-specific detail and generate policy briefs.
"""

import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)

from utils.rag_layer import retrieve_interventions

INFRASTRUCTURE_CONTEXT = {
    "Houston": """
HOUSTON FLOOD INFRASTRUCTURE CONTEXT (Harris County Flood Control District):
- Brays Bayou: 128 sq mi watershed, repeatedly overtopped. Project Brays only 40% done.
- Buffalo Bayou: Addicks/Barker reservoirs built for 50K homes, now serve 200K+.
- White Oak Bayou: northwest Houston, detention insufficient for 100-year events.
- Hunting Bayou: east Houston low-income areas, least improved of major bayous.
- 30% of Harvey-flooded structures were outside 100-year floodplain.
- Harris County added 400K residents 2000-2017, many in floodplain areas.
- Impervious surface coverage increased 25% from 1996-2017.
""",
    "Los Angeles": """
LA WILDFIRE INFRASTRUCTURE CONTEXT (CAL FIRE + LA County):
- Pacific Palisades: high FHSZ, single-access road (Sunset Blvd) evacuation bottleneck.
  Palisades Fire 2025 destroyed 6,837 structures.
- Altadena/Eaton Canyon: WUI dense residential. Eaton Fire destroyed 9,418 structures.
  Overhead power lines identified as ignition source.
- Malibu/Topanga: repeated burn area. Building codes not upgraded post-Woolsey.
- Hollywood Hills: aging infrastructure, narrow roads, low water pressure at elevation.
- 40% of vegetation management deferred 2023-2024. Defensible space compliance only 61%.
- SCE equipment implicated in Eaton Fire. 847 miles of high-risk lines not undergrounded.
""",
}

TOP_DAMAGE_DRIVERS = {
    "Houston": (
        "undersized bayou drainage infrastructure and 25% increase in impervious surface "
        "with continued residential development in 100-year floodplains"
    ),
    "Los Angeles": (
        "WUI residential development with deferred vegetation management, single-access "
        "evacuation routes, and aging overhead power infrastructure"
    ),
}

GROQ_MODEL = "llama-3.3-70b-versatile"


def _groq_chat(prompt: str, system: str = None) -> str:
    """Send a chat completion to GROQ and return the text response."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=2048,
    )
    return response.choices[0].message.content.strip()


def get_prevention_recommendations(
    city: str,
    disaster_type: str,
    next_event_cost_bn: float,
    total_historic_cost_bn: float,
    total_events: int,
    years_covered: str,
    top_damage_driver: str = None,
) -> list[dict]:
    """
    Retrieve interventions via RAG, enrich with GROQ.
    Falls back to RAG results directly on error.
    """
    rag_recs = retrieve_interventions(city, disaster_type, n=6)
    if not rag_recs:
        return _fallback_recommendations(city)

    try:
        recs_text = "\n".join([
            f"- {r['action']}: ${r['estimated_cost_mn']}M cost, "
            f"${r['projected_saving_mn']}M saving, {r['roi']}. "
            f"Evidence: {r['evidence']}"
            for r in rag_recs
        ])

        prompt = f"""You are a disaster policy analyst. Below are evidence-based
interventions for {city}, retrieved from a database of FEMA HMGP outcomes.

INTERVENTIONS DATABASE RESULTS:
{recs_text}

City: {city}
Disaster type: {disaster_type}
Infrastructure context: {top_damage_driver or TOP_DAMAGE_DRIVERS.get(city, "")}

For each intervention, rewrite the "detail" field to reference specific
{city} locations and infrastructure by name. Keep all costs and ROI the same.

Return ONLY a JSON array of exactly {min(5, len(rag_recs))} objects with:
- rank (int)
- action (str)
- detail (str, max 40 words, must reference specific {city} locations)
- estimated_cost_mn (float)
- projected_saving_mn (float)
- roi (str)
- evidence (str, max 20 words)

Return only the JSON array. No markdown, no explanation."""

        raw = _groq_chat(prompt)
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        enriched = json.loads(raw)
        return enriched
    except Exception:
        return rag_recs[:5]


def get_enriched_pattern_explanation(city: str, ml_explanation: str,
                                     infrastructure_df=None) -> str:
    """Refine the ML-generated pattern explanation into budget-committee language via GROQ."""
    infra_context = INFRASTRUCTURE_CONTEXT.get(city, "")
    if infrastructure_df is not None and hasattr(infrastructure_df, "to_json"):
        import json as _json
        try:
            infra_records = _json.loads(infrastructure_df.to_json(orient="records"))
            if infra_records:
                gaps = [r for r in infra_records if r.get("capacity_pct", 100) < 50][:2]
                if gaps:
                    gap_lines = "\n".join([
                        f"- {g['project_name']}: {int(g['capacity_pct'])}% capacity — {g.get('status', '')}"
                        for g in gaps
                    ])
                    infra_context += f"\n\nCritical infrastructure gaps:\n{gap_lines}"
        except Exception:
            pass

    prompt = f"""You are a disaster data analyst presenting to a city council budget committee.
Rewrite the following technical pattern explanation into clear, concise language
that a non-technical policymaker can understand in 30 seconds.

City: {city}
Technical explanation: {ml_explanation}

Infrastructure context (use this to explain WHY costs are growing):
{infra_context}

Rules:
- Keep it under 120 words
- No jargon, no acronyms
- Lead with the key number (% increase or $ amount)
- Explicitly contrast population growth with infrastructure gaps
- End with a one-sentence implication for the budget"""

    try:
        return _groq_chat(prompt)
    except Exception:
        return ""


def get_policy_brief(
    city: str,
    disaster_type: str,
    next_event_cost_bn: float,
    recommendations: list[dict],
) -> str:
    """Generate a one-page policy brief using GROQ."""
    rec_text = "\n".join([
        f"{r['rank']}. {r['action']} — ${r['estimated_cost_mn']}M cost, "
        f"${r['projected_saving_mn']}M saving ({r['roi']})"
        for r in recommendations
    ])

    prompt = f"""Write a policy brief (under 250 words) for {city} city council.
Cost of doing nothing vs cost of acting now.

City: {city}
Disaster type: {disaster_type}
Projected next event cost if nothing changes: ${next_event_cost_bn:.1f}B

Top recommended actions:
{rec_text}

Tone: direct, not alarmist. For a budget committee.
No bullet points. Plain paragraphs. End with a clear call to action.
Reference specific local infrastructure by name."""

    try:
        return _groq_chat(prompt)
    except Exception as e:
        return f"Policy brief generation unavailable: {e}"


def _fallback_recommendations(city: str) -> list[dict]:
    """Hardcoded fallback if RAG returns nothing."""
    if city == "Houston":
        return [
            {"rank":1,"action":"Brays Bayou Detention Expansion","detail":"Expand detention capacity along Brays Bayou","estimated_cost_mn":50,"projected_saving_mn":200,"roi":"4.0x return","evidence":"FEMA HMGP Project Brays reduced flood stages 2-3ft"},
            {"rank":2,"action":"Addicks Reservoir Capacity Upgrade","detail":"Increase reservoir capacity through sediment removal","estimated_cost_mn":75,"projected_saving_mn":278,"roi":"3.7x return","evidence":"USACE feasibility study 2023"},
            {"rank":3,"action":"Floodplain Buyout Program","detail":"Expand buyouts for 3,000+ high-risk properties","estimated_cost_mn":120,"projected_saving_mn":396,"roi":"3.3x return","evidence":"FEMA HMGP eliminated repeat flooding for 3,000 homes"},
        ]
    return [
        {"rank":1,"action":"Power Line Undergrounding","detail":"Underground 847 miles in high FHSZ zones","estimated_cost_mn":3000,"projected_saving_mn":12000,"roi":"4.0x return","evidence":"Eliminates power-line ignition source"},
        {"rank":2,"action":"WUI Building Code Upgrade","detail":"Mandate fire-resistant construction in all high FHSZ","estimated_cost_mn":50,"projected_saving_mn":180,"roi":"3.6x return","evidence":"60% reduction in structure ignition - Butte County"},
        {"rank":3,"action":"Vegetation Management Acceleration","detail":"Clear 100% of high-risk parcels annually","estimated_cost_mn":85,"projected_saving_mn":298,"roi":"3.5x return","evidence":"Defensible space reduces loss by 50%"},
    ]
