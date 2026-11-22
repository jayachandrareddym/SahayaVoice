"""
Formal Kannada complaint letter generator.

Uses IBM Granite (via watsonx.ai) to draft a properly formatted civic
complaint letter in Kannada script, following the standard Karnataka
government letter format, complete with:
  - Formal salutation
  - Subject line in Kannada
  - Body with problem description, location, duration, urgency
  - Complainant details
  - Date and closing

Also produces an English summary for record-keeping.
"""
from __future__ import annotations

import logging

from ..llm import complete
from .schema import ComplaintCategory, ComplaintLetter, ExtractedIntent

logger = logging.getLogger(__name__)

# ── Category display names in Kannada ────────────────────────────────────────

_CATEGORY_KN: dict[str, str] = {
    ComplaintCategory.WATER_SUPPLY:       "ನೀರು ಸರಬರಾಜು",
    ComplaintCategory.ROAD_DAMAGE:        "ರಸ್ತೆ ಹಾನಿ",
    ComplaintCategory.ELECTRICITY:        "ವಿದ್ಯುತ್ ಸಮಸ್ಯೆ",
    ComplaintCategory.SANITATION:         "ನೈರ್ಮಲ್ಯ",
    ComplaintCategory.STREET_LIGHT:       "ಬೀದಿ ದೀಪ",
    ComplaintCategory.GARBAGE_COLLECTION: "ತ್ಯಾಜ್ಯ ಸಂಗ್ರಹ",
    ComplaintCategory.DRAINAGE:           "ಒಳಚರಂಡಿ",
    ComplaintCategory.NOISE_POLLUTION:    "ಶಬ್ದ ಮಾಲಿನ್ಯ",
    ComplaintCategory.OTHER:              "ಸಾಮಾನ್ಯ ದೂರು",
}

_URGENCY_KN: dict[str, str] = {
    "low":      "ಕಡಿಮೆ ತುರ್ತು",
    "medium":   "ಮಧ್ಯಮ ತುರ್ತು",
    "high":     "ಹೆಚ್ಚಿನ ತುರ್ತು",
    "critical": "ಅತ್ಯಂತ ತುರ್ತು",
}

# ── Prompts ───────────────────────────────────────────────────────────────────

_LETTER_SYSTEM = """\
You are an expert government letter writer for Karnataka civic complaints.
Write a formal complaint letter IN KANNADA SCRIPT (not transliteration).

The letter must follow Karnataka government correspondence format:
  1. ಸ್ವೀಕರಿಸುವವರ ಹೆಸರು ಮತ್ತು ವಿಳಾಸ  (addressee)
  2. ವಿಷಯ: (Subject line)
  3. ಮಾನ್ಯರೇ,  (opening salutation)
  4. Body paragraphs — formal, respectful, factual
     - Clearly state the problem
     - Mention the exact location
     - State how long the problem has persisted
     - Describe the impact on citizens
     - Request specific action with reasonable deadline
  5. ನಿಮ್ಮ ವಿಶ್ವಾಸಿ, (closing)
  6. ದೂರುದಾರರ ಹೆಸರು ಮತ್ತು ಸಂಪರ್ಕ ಸಂಖ್ಯೆ (complainant details)
  7. ದಿನಾಂಕ: (date)

Output ONLY the Kannada letter text — no English, no markdown, no explanation.
"""

_SUMMARY_SYSTEM = """\
You are a civic complaint processing assistant.
Write a concise English summary (3–5 sentences) of the following Kannada complaint letter.
Include: complaint type, location, complainant name, main issue, and urgency.
Output only the English summary — no preamble, no markdown.
"""

_SUBJECT_SYSTEM = """\
Write a formal complaint subject line in Kannada script (one line only).
No explanation, no markdown, no English text.
"""


def _build_letter_prompt(intent: ExtractedIntent) -> str:
    """Build a detailed instruction prompt for the letter generator."""
    category_kn = _CATEGORY_KN.get(intent.category or ComplaintCategory.OTHER, "ಸಾಮಾನ್ಯ ದೂರು")
    urgency_kn  = _URGENCY_KN.get(intent.urgency, "ಮಧ್ಯಮ ತುರ್ತು")

    return f"""Write a formal Kannada civic complaint letter using these details:

Complaint type (ದೂರಿನ ವಿಷಯ): {category_kn}
Location (ಸ್ಥಳ): {intent.location or "ನಿರ್ದಿಷ್ಟಪಡಿಸಿಲ್ಲ"}
Problem description (ಸಮಸ್ಯೆ): {intent.description or "ಸಮಸ್ಯೆ ವಿವರಣೆ ಇಲ್ಲ"}
Complainant name (ದೂರುದಾರರ ಹೆಸರು): {intent.complainant_name or "ನಾಗರಿಕ"}
Contact number (ಮೊಬೈಲ್ ಸಂಖ್ಯೆ): {intent.contact_number or "ನೀಡಿಲ್ಲ"}
Date of incident (ಘಟನೆಯ ದಿನಾಂಕ): {intent.date_of_incident or "ಇತ್ತೀಚೆಗೆ"}
Urgency (ತುರ್ತು): {urgency_kn}

Addressee: ಮಾನ್ಯ ಆಯುಕ್ತರು, ಬೃಹತ್ ಬೆಂಗಳೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ (BBMP Commissioner)
"""


def _build_subject_prompt(intent: ExtractedIntent) -> str:
    category_kn = _CATEGORY_KN.get(intent.category or ComplaintCategory.OTHER, "ಸಾಮಾನ್ಯ ದೂರು")
    location    = intent.location or "ನಿರ್ದಿಷ್ಟ ಸ್ಥಳ"
    return f"Write one formal Kannada subject line for a complaint about: {category_kn} at {location}."


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_letter(intent: ExtractedIntent) -> ComplaintLetter:
    """
    Generate a formal Kannada complaint letter and English summary
    from a fully (or partially) populated ExtractedIntent.
    """
    logger.info("Generating Kannada complaint letter for category=%s", intent.category)

    # 1. Generate subject line
    subject_raw = await complete(
        prompt=_build_subject_prompt(intent),
        system_override=_SUBJECT_SYSTEM,
        max_tokens=80,
        temperature=0.1,
    )
    subject_line = subject_raw.strip().splitlines()[0].strip()

    # 2. Generate full Kannada letter
    kannada_raw = await complete(
        prompt=_build_letter_prompt(intent),
        system_override=_LETTER_SYSTEM,
        max_tokens=1024,
        temperature=0.2,
    )
    kannada_letter = kannada_raw.strip()

    # 3. Generate English summary from the letter
    english_raw = await complete(
        prompt=kannada_letter,
        system_override=_SUMMARY_SYSTEM,
        max_tokens=256,
        temperature=0.2,
    )
    english_summary = english_raw.strip()

    return ComplaintLetter(
        subject_line=subject_line,
        kannada_letter=kannada_letter,
        english_summary=english_summary,
    )
