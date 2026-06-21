"""
report_generator.py
Generates PDF reports using ReportLab.
"""

import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak,
)
from reportlab.lib import colors


DARK = HexColor("#1E293B")
MUTED = HexColor("#787774")
COST = HexColor("#9F2F2D")
GREEN = HexColor("#346538")


def _build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "Title2", parent=styles["Title"], fontSize=20, textColor=DARK,
        spaceAfter=6, leading=26,
    ))
    styles.add(ParagraphStyle(
        "Subtitle", parent=styles["Normal"], fontSize=10, textColor=MUTED,
        spaceAfter=20, leading=14,
    ))
    styles.add(ParagraphStyle(
        "SectionHead", parent=styles["Heading2"], fontSize=13, textColor=DARK,
        spaceBefore=16, spaceAfter=8, leading=18,
    ))
    styles.add(ParagraphStyle(
        "BodySmall", parent=styles["Normal"], fontSize=9, textColor=DARK,
        leading=13, spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        "SourceNote", parent=styles["Normal"], fontSize=7.5, textColor=MUTED,
        leading=10, spaceAfter=4,
    ))
    return styles


def generate_report_pdf(city_name: str, disaster_type: str, summary: dict,
                         projection: dict, interventions: list,
                         output_path: str = None) -> str:
    """Generate a PDF report and return the file path."""
    s = _build_styles()

    if output_path is None:
        output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports")
        os.makedirs(output_dir, exist_ok=True)
        safe = city_name.lower().replace(" ", "_")
        output_path = os.path.join(output_dir, f"disastercast_{safe}_{datetime.now():%Y%m%d}.pdf")

    doc = SimpleDocTemplate(output_path, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []

    # Title
    story.append(Paragraph("DisasterCast", s["Title2"]))
    story.append(Paragraph(
        f"Cost of Inaction Report — {city_name}, {disaster_type}",
        s["Subtitle"],
    ))
    story.append(Spacer(1, 12))

    # Summary
    story.append(Paragraph("Executive Summary", s["SectionHead"]))
    story.append(Paragraph(
        f"{city_name} has experienced {summary['total_events']} major {disaster_type.lower()} events "
        f"({summary['years_covered']}) with a total of ${summary['total_damage_bn']:.0f}B in damages, "
        f"displacing {summary['total_displaced']:,} people. "
        f"The cost escalation rate is {summary['escalation_rate_pct']}% per year.",
        s["BodySmall"],
    ))

    # Projection
    story.append(Paragraph("Projected Cost of Next Event", s["SectionHead"]))
    p = projection
    rows = [
        ["Metric", "Value"],
        ["Direct damage", f"${p['direct_damage_bn']:.1f}B"],
        ["Displaced people", f"{p['est_displaced']:,}"],
        ["Displacement cost", f"${p['displacement_cost_mn']:.0f}M"],
        ["Healthcare cost", f"${p['healthcare_cost_mn']:.0f}M"],
        ["Lost wages", f"${p['lost_wages_mn']:.0f}M"],
        ["Total projected cost", f"${p['total_projected_cost_bn']:.1f}B"],
    ]
    t = Table(rows, colWidths=[2.2*inch, 1.2*inch])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1E293B")),
        ("TEXTCOLOR", (0, 1), (-1, -1), DARK),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#EAEAEA")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#F7F6F3"), colors.white]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    # Interventions
    story.append(Paragraph("Recommended Interventions", s["SectionHead"]))
    i_rows = [["#", "Action", "Cost", "Saving", "ROI"]]
    for inv in interventions[:5]:
        i_rows.append([
            str(inv["rank"]),
            inv["action"],
            f"${inv['estimated_cost_mn']:.0f}M",
            f"${inv['projected_saving_mn']:.0f}M",
            inv["roi"],
        ])
    it = Table(i_rows, colWidths=[0.3*inch, 2*inch, 0.7*inch, 0.7*inch, 0.7*inch])
    it.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 1), (-1, -1), DARK),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#EAEAEA")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#F7F6F3"), colors.white]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(it)

    # Source notes
    story.append(Paragraph("Data Sources", s["SectionHead"]))
    story.append(Paragraph(
        "FEMA OpenFEMA API (Disaster Declarations, Housing Assistance Program), "
        "Harris County Flood Control District (HCFCD), "
        "CalFire, Los Angeles County, "
        "OECD 2025 Disaster Cost Research, "
        "Urban Institute Disaster-to-Homelessness Research.",
        s["SourceNote"],
    ))
    story.append(Paragraph(
        f"Generated by Disaster Intervention Strategy Simulator. "
        f"USAII Global AI Hackathon 2026. {datetime.now():%B %d, %Y}",
        s["SourceNote"],
    ))

    doc.build(story)
    return output_path
