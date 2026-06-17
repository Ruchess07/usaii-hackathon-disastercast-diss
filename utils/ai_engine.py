"""
ai_engine.py
Uses Google Gemini API (free tier) to generate city-specific ranked
prevention recommendations and policy briefs.
Get your free API key at: https://aistudio.google.com/app/apikey
"""

import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel("gemini-1.5-flash")


def get_prevention_recommendations(
    city: str,
    disaster_type: str,
    next_event_cost_bn: float,
    total_historic_cost_bn: float,
    total_events: int,
    years_covered: str,
    top_damage_driver: str,
) -> list[dict]:
    """
    Calls Gemini to generate ranked prevention recommendations.
    Returns a list of dicts with action, cost estimate, and projected saving.
    """

    prompt = f"""You are a disaster prevention policy analyst with expertise
in FEMA Hazard Mitigation Grant Program outcomes, urban flood engineering,
and wildfire risk management.

City: {city}
Disaster type: {disaster_type}
Historic events: {total_events} major events from {years_covered}
Total historic damage: ${total_historic_cost_bn:.1f}B
Projected next event cost (no action): ${next_event_cost_bn:.1f}B
Primary damage driver: {top_damage_driver}

Generate exactly 5 specific, ranked prevention actions for {city} to reduce
the cost of the next {disaster_type.lower()} event.

Return ONLY a JSON array of exactly 5 objects. Each object must have:
- rank (int 1-5)
- action (str, specific intervention, max 12 words)
- detail (str, what exactly to do and where, max 40 words)
- estimated_cost_mn (float, cost in millions USD)
- projected_saving_mn (float, projected disaster cost reduction in millions USD)
- roi (str, e.g. "4.2x return")
- evidence (str, what similar intervention achieved elsewhere, max 20 words)

Return only the JSON array. No markdown, no explanation, no code fences."""

    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if Gemini adds them anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    recommendations = json.loads(raw)
    return recommendations


def get_policy_brief(
    city: str,
    disaster_type: str,
    next_event_cost_bn: float,
    recommendations: list[dict],
) -> str:
    """
    Generates a plain-language one-page policy brief
    the city official can take into a budget meeting.
    """

    rec_text = "\n".join([
        f"{r['rank']}. {r['action']} — est. cost ${r['estimated_cost_mn']}M, "
        f"projected saving ${r['projected_saving_mn']}M ({r['roi']})"
        for r in recommendations
    ])

    prompt = f"""Write a concise policy brief (under 250 words) for
{city} city council. Frame it as: the cost of doing nothing vs the cost
of acting now. Use this data:

City: {city}
Disaster type: {disaster_type}
Projected next event cost if nothing changes: ${next_event_cost_bn:.1f}B

Top 5 recommended actions:
{rec_text}

Tone: direct, not alarmist. Written for a budget committee, not scientists.
No bullet points. Plain paragraphs. End with a clear call to action."""

    response = model.generate_content(prompt)
    return response.text.strip()
