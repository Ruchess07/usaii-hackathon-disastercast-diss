"""
app.py — DisasterCast main application
Run with: streamlit run app.py
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from utils.data_loader import get_houston_data, get_la_data, get_city_summary
from utils.cost_engine import (
    project_next_event_cost,
    compound_inaction_cost,
    prevention_savings,
)
from utils.ai_engine import get_prevention_recommendations, get_policy_brief

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="DisasterCast",
    page_icon="🌊",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
st.markdown("""
<style>
.main-header {
    font-size: 2.2rem;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 0.2rem;
}
.sub-header {
    font-size: 1.05rem;
    color: #555;
    margin-bottom: 2rem;
}
.metric-card {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 1.2rem 1.4rem;
    border: 1px solid #e0e0e0;
}
.metric-val {
    font-size: 2rem;
    font-weight: 700;
    color: #c0392b;
    margin: 0;
}
.metric-val-green {
    font-size: 2rem;
    font-weight: 700;
    color: #1a7a4a;
    margin: 0;
}
.metric-label {
    font-size: 0.82rem;
    color: #777;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.rec-card {
    background: #fff;
    border-radius: 12px;
    padding: 1.1rem 1.3rem;
    border: 1px solid #e8e8e8;
    margin-bottom: 0.8rem;
    border-left: 4px solid #1a7a4a;
}
.rec-rank {
    font-size: 0.75rem;
    font-weight: 600;
    color: #1a7a4a;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}
.rec-action {
    font-size: 1.05rem;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0.2rem 0 0.4rem;
}
.rec-detail {
    font-size: 0.88rem;
    color: #555;
    line-height: 1.5;
    margin-bottom: 0.6rem;
}
.rec-stats {
    display: flex;
    gap: 1.5rem;
    font-size: 0.82rem;
}
.brief-box {
    background: #f0f4f8;
    border-radius: 12px;
    padding: 1.4rem 1.6rem;
    border: 1px solid #cdd5e0;
    font-size: 0.93rem;
    line-height: 1.7;
    color: #333;
}
.section-title {
    font-size: 1.35rem;
    font-weight: 600;
    color: #1a1a2e;
    margin-bottom: 1rem;
    padding-bottom: 0.4rem;
    border-bottom: 2px solid #e0e0e0;
}
.source-note {
    font-size: 0.75rem;
    color: #999;
    font-style: italic;
}
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
st.markdown('<p class="main-header">DisasterCast</p>', unsafe_allow_html=True)
st.markdown(
    '<p class="sub-header">AI-powered cost of inaction simulator for '
    'flood and wildfire prevention policy</p>',
    unsafe_allow_html=True
)

# ---------------------------------------------------------------------------
# SCREEN 1 — City selector
# ---------------------------------------------------------------------------
st.markdown('<p class="section-title">Select a city</p>',
            unsafe_allow_html=True)

col1, col2 = st.columns(2)

with col1:
    city_choice = st.radio(
        "City",
        ["Houston, Texas", "Los Angeles, California"],
        label_visibility="collapsed",
        horizontal=True,
    )

city = "Houston" if "Houston" in city_choice else "Los Angeles"
disaster_type = "Flood" if city == "Houston" else "Wildfire"
df = get_houston_data() if city == "Houston" else get_la_data()
summary = get_city_summary(city)

# Key city stats row
c1, c2, c3, c4 = st.columns(4)
with c1:
    st.markdown(f"""<div class="metric-card">
    <p class="metric-label">Total historic damage</p>
    <p class="metric-val">${summary['total_damage_bn']:.0f}B</p>
    <p class="source-note">{summary['years_covered']}</p>
    </div>""", unsafe_allow_html=True)
with c2:
    st.markdown(f"""<div class="metric-card">
    <p class="metric-label">Major {disaster_type.lower()} events</p>
    <p class="metric-val">{summary['total_events']}</p>
    <p class="source-note">Documented events with federal declaration</p>
    </div>""", unsafe_allow_html=True)
with c3:
    st.markdown(f"""<div class="metric-card">
    <p class="metric-label">Total people displaced</p>
    <p class="metric-val">{summary['total_displaced']:,}</p>
    <p class="source-note">Cumulative across all events</p>
    </div>""", unsafe_allow_html=True)
with c4:
    st.markdown(f"""<div class="metric-card">
    <p class="metric-label">Worst single event</p>
    <p class="metric-val" style="font-size:1rem;color:#c0392b;">
    {summary['worst_event']}</p>
    <p class="source-note">FEMA / CalFire records</p>
    </div>""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# SCREEN 2 — Cost of inaction
# ---------------------------------------------------------------------------
st.markdown('<p class="section-title">Cost of doing nothing</p>',
            unsafe_allow_html=True)

# Historic cost chart
cost_col = "total_damage_bn" if city == "Houston" else "total_damage_bn"
year_col = "year"

fig_hist = go.Figure()
fig_hist.add_trace(go.Bar(
    x=df[year_col],
    y=df[cost_col],
    name="Historic damage ($B)",
    marker_color="#c0392b",
    text=[f"${v:.1f}B" for v in df[cost_col]],
    textposition="outside",
))

# Add trend line
z = np.polyfit(df[year_col], df[cost_col], 1)
p = np.poly1d(z)
x_trend = list(df[year_col]) + [2028, 2031]
fig_hist.add_trace(go.Scatter(
    x=x_trend,
    y=[p(x) for x in x_trend],
    mode="lines",
    name="Cost trend (if nothing changes)",
    line=dict(color="#e67e22", dash="dash", width=2),
))

fig_hist.update_layout(
    title=f"{city} — historic {disaster_type.lower()} damage costs",
    xaxis_title="Year",
    yaxis_title="Total damage ($B)",
    plot_bgcolor="white",
    paper_bgcolor="white",
    height=380,
    legend=dict(orientation="h", yanchor="bottom", y=1.02),
    margin=dict(t=60, b=40),
)
fig_hist.update_xaxes(showgrid=False)
fig_hist.update_yaxes(showgrid=True, gridcolor="#f0f0f0")

st.plotly_chart(fig_hist, use_container_width=True)

# Projected next event
last_cost = df[cost_col].iloc[-1]
proj = project_next_event_cost(city, last_cost, 3)

st.markdown("#### Projected cost of the next event if nothing changes")
p1, p2, p3, p4, p5 = st.columns(5)

metrics = [
    ("Direct damage", f"${proj['direct_damage_bn']:.1f}B", "Infrastructure repair"),
    ("People displaced", f"{proj['est_displaced']:,}", f"${proj['displacement_cost_mn']:.0f}M housing cost"),
    ("Healthcare burden", f"${proj['healthcare_cost_mn']:.0f}M", "Emergency + recovery care"),
    ("School days lost", f"{proj['school_days_lost']} days", f"${proj['school_cost_mn']:.0f}M system cost"),
    ("Lost wages", f"${proj['lost_wages_mn']:.0f}M", "Informal + formal workers"),
]

for col, (label, val, sub) in zip([p1, p2, p3, p4, p5], metrics):
    with col:
        st.markdown(f"""<div class="metric-card">
        <p class="metric-label">{label}</p>
        <p class="metric-val">{val}</p>
        <p class="source-note">{sub}</p>
        </div>""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)
st.markdown(f"""
<div style="background:#fff5f5;border-radius:12px;padding:1rem 1.4rem;
border:1px solid #f5c6cb;">
<strong style="color:#c0392b;">Total projected cost of next event:
${proj['total_projected_cost_bn']:.1f}B</strong> — based on observed cost
escalation patterns across {summary['total_events']} events ({summary['years_covered']}).
The same vulnerable zones, the same infrastructure gaps, the same outcome —
but more expensive each time as population density grows.
</div>
""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Compounding cost chart
compound_df = compound_inaction_cost(city, last_cost, n_future_events=4)

fig_compound = go.Figure()
fig_compound.add_trace(go.Bar(
    x=compound_df["event_number"] + " (~" + compound_df["approx_year"].astype(str) + ")",
    y=compound_df["total_cost_bn"],
    marker_color=["#e67e22", "#d35400", "#c0392b", "#a93226"],
    text=[f"${v:.1f}B" for v in compound_df["total_cost_bn"]],
    textposition="outside",
    name="Projected cost ($B)",
))
fig_compound.update_layout(
    title="Compounding cost of inaction — next 4 events with no infrastructure change",
    xaxis_title="Future event",
    yaxis_title="Projected total cost ($B)",
    plot_bgcolor="white",
    paper_bgcolor="white",
    height=340,
    showlegend=False,
    margin=dict(t=60, b=40),
)
fig_compound.update_xaxes(showgrid=False)
fig_compound.update_yaxes(showgrid=True, gridcolor="#f0f0f0")

st.plotly_chart(fig_compound, use_container_width=True)
st.caption(
    "Projection based on observed cost escalation rate across historic events. "
    "Assumes no change in infrastructure, zoning, or prevention policy. "
    "Sources: FEMA OpenFEMA / CalFire / Rice Kinder Institute."
)

# ---------------------------------------------------------------------------
# SCREEN 3 — Prevention priorities
# ---------------------------------------------------------------------------
st.markdown("<br>", unsafe_allow_html=True)
st.markdown('<p class="section-title">What the city should prioritise</p>',
            unsafe_allow_html=True)

top_damage_drivers = {
    "Houston": "undersized drainage infrastructure in Brays, Buffalo, and "
               "White Oak bayous combined with continued residential "
               "development in 100-year floodplain",
    "Los Angeles": "residential development in wildland-urban interface zones "
                   "with inadequate vegetation management, insufficient "
                   "firebreaks, and aging power infrastructure on hillsides",
}

if st.button("Generate AI prevention recommendations", type="primary"):
    with st.spinner("Analysing damage patterns and generating ranked recommendations..."):
        try:
            recs = get_prevention_recommendations(
                city=city,
                disaster_type=disaster_type,
                next_event_cost_bn=proj["total_projected_cost_bn"],
                total_historic_cost_bn=summary["total_damage_bn"],
                total_events=summary["total_events"],
                years_covered=summary["years_covered"],
                top_damage_driver=top_damage_drivers[city],
            )
            st.session_state["recs"] = recs
            st.session_state["city_for_recs"] = city
        except Exception as e:
            st.error(f"API error: {e}. Check your ANTHROPIC_API_KEY.")
            st.session_state["recs"] = None

if st.session_state.get("recs") and st.session_state.get("city_for_recs") == city:
    recs = st.session_state["recs"]

    savings = prevention_savings(city, last_cost)
    sa, sb = st.columns(2)
    with sa:
        st.markdown(f"""<div class="metric-card">
        <p class="metric-label">Cost if nothing changes (next event)</p>
        <p class="metric-val">${savings['next_event_cost_bn']:.1f}B</p>
        </div>""", unsafe_allow_html=True)
    with sb:
        st.markdown(f"""<div class="metric-card">
        <p class="metric-label">Preventable with targeted action</p>
        <p class="metric-val-green">${savings['prevented_cost_bn']:.1f}B</p>
        <p class="source-note">~{savings['reduction_pct']}% reduction —
        based on FEMA HMGP outcomes data</p>
        </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("#### Ranked prevention actions — by cost per disaster dollar saved")

    for r in recs:
        st.markdown(f"""
        <div class="rec-card">
            <p class="rec-rank">Priority {r.get('rank', '?')}</p>
            <p class="rec-action">{r.get('action', '')}</p>
            <p class="rec-detail">{r.get('detail', '')}</p>
            <div class="rec-stats">
                <span>Intervention cost: <strong>${r.get('estimated_cost_mn', '?')}M</strong></span>
                <span>Projected saving: <strong>${r.get('projected_saving_mn', '?')}M</strong></span>
                <span>ROI: <strong>{r.get('roi', '?')}</strong></span>
            </div>
            <p class="source-note" style="margin-top:0.4rem;">
            Evidence: {r.get('evidence', '')}</p>
        </div>
        """, unsafe_allow_html=True)

    # ROI comparison chart
    fig_roi = go.Figure(go.Bar(
        x=[r.get("action", "")[:35] + "..." for r in recs],
        y=[r.get("projected_saving_mn", 0) for r in recs],
        marker_color="#1a7a4a",
        text=[f"${r.get('projected_saving_mn', 0)}M saved" for r in recs],
        textposition="outside",
    ))
    fig_roi.update_layout(
        title="Projected disaster cost reduction per intervention ($M)",
        plot_bgcolor="white",
        paper_bgcolor="white",
        height=340,
        showlegend=False,
        margin=dict(t=60, b=100),
        xaxis_tickangle=-20,
    )
    fig_roi.update_xaxes(showgrid=False)
    fig_roi.update_yaxes(showgrid=True, gridcolor="#f0f0f0")
    st.plotly_chart(fig_roi, use_container_width=True)

    # Policy brief
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("#### Policy brief — ready for budget committee")
    if st.button("Generate policy brief"):
        with st.spinner("Drafting policy brief..."):
            try:
                brief = get_policy_brief(
                    city=city,
                    disaster_type=disaster_type,
                    next_event_cost_bn=proj["total_projected_cost_bn"],
                    recommendations=recs,
                )
                st.session_state["brief"] = brief
            except Exception as e:
                st.error(f"API error: {e}")

    if st.session_state.get("brief"):
        st.markdown(
            f'<div class="brief-box">{st.session_state["brief"]}</div>',
            unsafe_allow_html=True
        )
        st.download_button(
            "Download policy brief",
            data=st.session_state["brief"],
            file_name=f"disastercast_policy_brief_{city.lower().replace(' ', '_')}.txt",
            mime="text/plain",
        )

# ---------------------------------------------------------------------------
# Footer
# ---------------------------------------------------------------------------
st.markdown("<br><br>", unsafe_allow_html=True)
st.markdown("""
<hr style="border:1px solid #eee;">
<p style="font-size:0.78rem;color:#aaa;text-align:center;">
DisasterCast — USAII Global AI Hackathon 2026 | Graduate Track | Brief 6A + 6B<br>
Data sources: FEMA OpenFEMA, CalFire, Harris County HCFCD, LA County CEO Dashboard,
Rice Kinder Institute, OECD 2025 | AI: Claude (Anthropic)
</p>
""", unsafe_allow_html=True)

import numpy as np
