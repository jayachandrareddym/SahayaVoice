"""
SahayaVoice – PDF Generation module
Owner: Member 7 (TTS & Document Output)

Generates a formatted PDF of the official Kannada complaint letter using reportlab.
The PDF embeds a Kannada-compatible Unicode font so the script renders correctly.

API contract (wired into FastAPI by main.py):
  POST /api/download-pdf
  Body JSON:
    { "kannada_letter": "<full Kannada text>", "summary": "<English summary>", "language": "en" }
  Response:
    application/pdf binary stream  →  browser triggers download
"""

from __future__ import annotations

import io
import os
from datetime import datetime

# ---------------------------------------------------------------------------
# reportlab imports – installed via requirements.txt
# ---------------------------------------------------------------------------
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    Table,
    TableStyle,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ---------------------------------------------------------------------------
# Font registration
# Noto Sans Kannada ships with most Linux distros and can be bundled.
# If the font file is missing we fall back to Helvetica (Latin only –
# Kannada glyphs won't display, but the PDF will still generate).
# ---------------------------------------------------------------------------
_FONT_NAME = "Helvetica"  # safe default

_FONT_CANDIDATES = [
    # bundled alongside this file
    os.path.join(os.path.dirname(__file__), "..", "fonts", "NotoSansKannada-Regular.ttf"),
    # common system locations
    "/usr/share/fonts/truetype/noto/NotoSansKannada-Regular.ttf",
    "C:/Windows/Fonts/NotoSansKannada-Regular.ttf",
]

for _font_path in _FONT_CANDIDATES:
    if os.path.isfile(_font_path):
        try:
            pdfmetrics.registerFont(TTFont("NotoSansKannada", _font_path))
            _FONT_NAME = "NotoSansKannada"
        except Exception:
            pass
        break


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_pdf(kannada_letter: str, summary: str = "") -> bytes:
    """
    Build a PDF document containing the official Kannada complaint letter
    and an optional English/Hindi summary section.

    Args:
        kannada_letter: The formal Kannada complaint text.
        summary:        English/Hindi verification summary (optional).

    Returns:
        Raw PDF bytes.
    """
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        title="SahayaVoice – Civic Complaint Letter",
        author="SahayaVoice AI",
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "SVTitle",
        parent=styles["Title"],
        fontName=_FONT_NAME,
        fontSize=16,
        textColor=colors.HexColor("#4f46e5"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "SVSubtitle",
        parent=styles["Normal"],
        fontName=_FONT_NAME,
        fontSize=9,
        textColor=colors.HexColor("#6b7280"),
        spaceAfter=12,
    )
    section_heading = ParagraphStyle(
        "SVHeading",
        parent=styles["Heading2"],
        fontName=_FONT_NAME,
        fontSize=11,
        textColor=colors.HexColor("#1f2328"),
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "SVBody",
        parent=styles["Normal"],
        fontName=_FONT_NAME,
        fontSize=11,
        leading=18,
        textColor=colors.HexColor("#1f2328"),
    )
    summary_style = ParagraphStyle(
        "SVSummary",
        parent=styles["Normal"],
        fontName="Helvetica",   # summary is English/Latin – no special font needed
        fontSize=10,
        leading=16,
        textColor=colors.HexColor("#374151"),
        backColor=colors.HexColor("#f0fdf4"),
        borderPadding=(6, 6, 6, 6),
    )
    footer_style = ParagraphStyle(
        "SVFooter",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        textColor=colors.HexColor("#9ca3af"),
        alignment=1,  # centre
    )

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("🎙 SahayaVoice", title_style))
    story.append(Paragraph(
        f"Official Civic Complaint Letter &nbsp;·&nbsp; "
        f"Generated: {datetime.now().strftime('%d %B %Y, %H:%M')}",
        subtitle_style,
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))

    # ── Kannada letter ────────────────────────────────────────────────────────
    story.append(Paragraph("ಅಧಿಕೃತ ದೂರು ಪತ್ರ  (Official Kannada Complaint Letter)", section_heading))

    # Split on newlines to preserve formatting
    for line in kannada_letter.splitlines():
        line = line.strip()
        if line:
            story.append(Paragraph(line, body_style))
            story.append(Spacer(1, 4))
        else:
            story.append(Spacer(1, 8))

    # ── English summary ───────────────────────────────────────────────────────
    if summary:
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Paragraph("Verification Summary (English)", section_heading))
        for line in summary.splitlines():
            line = line.strip()
            if line:
                story.append(Paragraph(line, summary_style))
                story.append(Spacer(1, 4))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Generated by SahayaVoice · IBM Bobathon · Voice AI Track · Bengaluru",
        footer_style,
    ))

    doc.build(story)
    return buf.getvalue()
