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
- Brays Bayou: 128 sq mi watershed, historically repeatedly overtopped before mitigation work.
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
  Power infrastructure under active investigation as a possible ignition source, with
  state fire officials and a federal lawsuit pointing to SCE equipment, though SCE has
  not confirmed cause as of its own public filings.
- Malibu/Topanga: repeated burn area. Building codes upgraded January 2026 (Ordinance No. 531,
  requires Class A roofing in high fire zones), but rebuild pace is slow, only about 40% of
  homes destroyed in the 2018 Woolsey Fire had completed reconstruction as of late 2025.
- Hollywood Hills: aging infrastructure, narrow roads, low water pressure at elevation.
- Insurance Institute for Business and Home Safety post-fire investigation found homes with
  four basic hardening measures (Class A roof, noncombustible siding, double-pane windows,
  enclosed eaves) had a 54% chance of no damage in the 2025 fires. Homes with more than 25%
  fuel cover in their defensible space zone had a 90% likelihood of damage or destruction.
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

        prompt = f"""You are explaining disaster prevention recommendations to someone
with NO background in urban planning, engineering, or disaster policy.
Imagine you are explaining this to a curious friend who has never heard
terms like "detention basin" or "floodplain" before.

Below are evidence-based interventions for {city}, retrieved from a database
of FEMA HMGP outcomes.

INTERVENTIONS DATABASE RESULTS:
{recs_text}

City: {city}
Disaster type: {disaster_type}
Infrastructure context: {top_damage_driver or TOP_DAMAGE_DRIVERS.get(city, "")}

For each intervention, write THREE separate explanations:

1. "detail" (max 40 words): What to physically do and where, referencing
   specific {city} locations by name. Technical but concise.

2. "plain_explanation" (max 60 words): Explain it the way you would to
   someone who has never studied this. Use a simple analogy if helpful.
   Explain WHY this specific location keeps flooding/burning, and WHAT
   this fix physically changes about that. No jargon — if you must use
   a technical term, define it in the same sentence.

3. "why_this_matters" (max 30 words): One sentence connecting this fix
   to a real human outcome — fewer families displaced, fewer school days
   lost, faster recovery. Make the cost-benefit feel concrete, not abstract.

Keep all costs and ROI numbers exactly the same as provided.

Return ONLY a JSON array of exactly {min(5, len(rag_recs))} objects with:
- rank (int)
- action (str)
- detail (str, max 40 words)
- plain_explanation (str, max 60 words, newbie-friendly)
- why_this_matters (str, max 30 words)
- estimated_cost_mn (float)
- projected_saving_mn (float)
- roi (str)
- evidence (str, max 20 words)

Return only the JSON array. No markdown, no explanation outside the JSON."""

        raw = _groq_chat(prompt)
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        enriched = json.loads(raw)

        # Numeric sanity check. The prompt instructs the model to keep
        # cost and saving figures identical to the RAG source data, but
        # an instruction in a prompt is not a guarantee, nothing
        # previously verified this actually happened. Match each
        # enriched recommendation back to its source RAG record by
        # action name and confirm the dollar figures were not silently
        # altered, hallucinated, or dropped during enrichment. If a
        # mismatch is found for any recommendation, the entire response
        # is treated as untrustworthy and the function falls back to
        # the raw RAG data, which has no model-generated numbers to be
        # wrong in the first place.
        rag_by_action = {r["action"]: r for r in rag_recs}
        for rec in enriched:
            source = rag_by_action.get(rec.get("action"))
            if source is None:
                continue
            cost_match = abs(rec.get("estimated_cost_mn", -1) - source["estimated_cost_mn"]) < 0.01
            saving_match = abs(rec.get("projected_saving_mn", -1) - source["projected_saving_mn"]) < 0.01
            if not (cost_match and saving_match):
                raise ValueError(
                    f"GROQ altered source numbers for '{rec.get('action')}': "
                    f"cost {rec.get('estimated_cost_mn')} vs {source['estimated_cost_mn']}, "
                    f"saving {rec.get('projected_saving_mn')} vs {source['projected_saving_mn']}"
                )

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


GLOSSARY = {
    "detention basin": "A man-made pond that temporarily holds rainwater during a storm, releasing it slowly afterward instead of letting it flood neighborhoods all at once.",
    "floodplain": "Low-lying land near a river or bayou that naturally floods when water levels rise. Building homes here means they flood again and again.",
    "100-year floodplain": "An area with a 1% chance of flooding in any given year. It sounds rare, but over a 30-year mortgage that is roughly a 1-in-4 chance of flooding at least once.",
    "WUI": "Wildland-urban interface — the zone where houses are built right up against forests or brushland, putting them directly in a wildfire's path.",
    "defensible space": "Cleared, well-maintained land around a home that gives firefighters room to work and slows a wildfire's approach.",
    "HMGP": "FEMA's Hazard Mitigation Grant Program — federal funding that pays for projects designed to prevent future disaster damage, not just repair past damage.",
    "fire hazard severity zone": "An official rating of how likely an area is to burn in a wildfire, based on vegetation, terrain, and weather patterns.",
    "buyout program": "A government program that purchases homes in repeatedly flooded areas at fair value so families can move somewhere safer.",
    "impervious surface": "Hard surfaces like roads, parking lots, and rooftops that rainwater cannot soak into, forcing more water into drainage systems all at once.",
}


def get_glossary() -> dict:
    """Returns the jargon glossary for frontend tooltip use."""
    return GLOSSARY



def _fallback_recommendations(city: str) -> list[dict]:
    """Hardcoded fallback if RAG returns nothing."""
    if city == "Houston":
        return [
            {"rank":1,"action":"White Oak Bayou Detention Expansion","detail":"Add detention capacity in northwest Houston's White Oak Bayou watershed","plain_explanation":"White Oak Bayou is a channel that carries rainwater away from northwest Houston neighborhoods. When too much rain falls too fast, it overflows into homes. This project adds holding ponds along the channel so it can absorb more water before overflowing.","why_this_matters":"Fewer families lose their homes and fewer kids miss school when this bayou floods.","estimated_cost_mn":45,"projected_saving_mn":162,"roi":"3.6x return","evidence":"HCFCD White Oak Bayou watershed improvement program"},
            {"rank":2,"action":"Addicks Reservoir Capacity Upgrade","detail":"Increase reservoir capacity through sediment removal","plain_explanation":"Addicks Reservoir was built in the 1940s to hold floodwater for about 50,000 homes. Houston has grown so much that it now needs to protect over 200,000 homes with the same reservoir. Removing built-up sediment restores some of its original capacity.","why_this_matters":"A bigger safety margin means less catastrophic flooding when the next big storm hits.","estimated_cost_mn":75,"projected_saving_mn":278,"roi":"3.7x return","evidence":"USACE feasibility study 2023"},
            {"rank":3,"action":"Floodplain Buyout Program","detail":"Expand buyouts for 3,000+ high-risk properties","plain_explanation":"Some homes are built in spots that will flood again and again no matter what infrastructure improvements are made. This program pays homeowners fair value to move out permanently, and the land becomes open space that can safely absorb floodwater instead.","why_this_matters":"Permanently removes families from repeat-flood danger instead of asking them to rebuild every few years.","estimated_cost_mn":120,"projected_saving_mn":396,"roi":"3.3x return","evidence":"FEMA HMGP eliminated repeat flooding for 3,000 homes"},
        ]
    return [
        {"rank":1,"action":"Power Line Undergrounding","detail":"Underground 847 miles in high FHSZ zones","plain_explanation":"Overhead power lines can spark wildfires when wind knocks branches into them or when equipment fails in dry, windy conditions. Burying these lines underground removes that ignition risk entirely in the highest-danger zones.","why_this_matters":"Removes one of the most common causes of the largest, deadliest wildfires.","estimated_cost_mn":3000,"projected_saving_mn":12000,"roi":"4.0x return","evidence":"Eliminates power-line ignition source"},
        {"rank":2,"action":"WUI Building Code Upgrade","detail":"Mandate fire-resistant construction in all high FHSZ","plain_explanation":"WUI means wildland-urban interface, the area where houses meet wild vegetation. Homes here often have wood roofs and vents that let embers in. Requiring fire-resistant materials means a home is far more likely to survive when fire passes through the neighborhood.","why_this_matters":"More homes survive wildfires, so fewer families lose everything and need years to rebuild.","estimated_cost_mn":50,"projected_saving_mn":180,"roi":"3.6x return","evidence":"60% reduction in structure ignition - Butte County"},
        {"rank":3,"action":"Vegetation Management Acceleration","detail":"Clear 100% of high-risk parcels annually","plain_explanation":"Dry brush and overgrown vegetation act like fuel for wildfires. Clearing it regularly creates gaps that slow a fire down or stop it before it reaches homes, similar to how a firebreak works in a controlled burn.","why_this_matters":"Slows fires down enough for firefighters to respond before they reach populated areas.","estimated_cost_mn":85,"projected_saving_mn":298,"roi":"3.5x return","evidence":"Defensible space reduces loss by 50%"},
    ]
