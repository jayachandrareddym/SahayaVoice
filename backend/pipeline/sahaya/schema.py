"""
Shared Pydantic models for the SahayaVoice civic complaint engine.
All public data structures live here to avoid circular imports.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


# ── Complaint categories ───────────────────────────────────────────────────────

class ComplaintCategory(str, Enum):
    WATER_SUPPLY       = "water_supply"
    ROAD_DAMAGE        = "road_damage"
    ELECTRICITY        = "electricity"
    SANITATION         = "sanitation"
    STREET_LIGHT       = "street_light"
    GARBAGE_COLLECTION = "garbage_collection"
    DRAINAGE           = "drainage"
    NOISE_POLLUTION    = "noise_pollution"
    OTHER              = "other"


# ── Extracted intent ──────────────────────────────────────────────────────────

class ExtractedIntent(BaseModel):
    """
    Raw intent extracted from a single utterance or accumulated conversation.
    Fields may be None when the user hasn't mentioned them yet.
    """
    category: ComplaintCategory | None = Field(
        None,
        description="Type of civic complaint",
    )
    location: str | None = Field(
        None,
        description="Street address, ward, landmark, or area name",
    )
    description: str | None = Field(
        None,
        description="Detailed description of the problem in the user's own words",
    )
    complainant_name: str | None = Field(
        None,
        description="Full name of the person filing the complaint",
    )
    contact_number: str | None = Field(
        None,
        description="Phone number of the complainant",
    )
    date_of_incident: str | None = Field(
        None,
        description="Date the problem was first noticed (ISO 8601 or natural language)",
    )
    urgency: Literal["low", "medium", "high", "critical"] = Field(
        "medium",
        description="Urgency level inferred from the user's statement",
    )
    detected_language: Literal["kannada", "hindi", "english", "unknown"] = Field(
        "unknown",
        description="Language detected in the user's input",
    )
    raw_input: str = Field("", description="Original user utterance(s)")


# ── Missing field descriptor ──────────────────────────────────────────────────

REQUIRED_FIELDS: list[str] = [
    "category",
    "location",
    "description",
    "complainant_name",
    "contact_number",
]

class MissingField(BaseModel):
    field: str
    prompt_kannada: str
    prompt_hindi: str
    prompt_english: str


# ── Clarification state ───────────────────────────────────────────────────────

class ClarificationState(BaseModel):
    """Tracks progress of the multi-turn clarification loop."""
    intent: ExtractedIntent
    missing: list[MissingField] = Field(default_factory=list)
    round: int = 0
    complete: bool = False


# ── Final complaint output ────────────────────────────────────────────────────

class ComplaintLetter(BaseModel):
    """Formal Kannada complaint letter with English translation."""
    kannada_letter: str = Field(description="Full formal letter in Kannada script")
    english_summary: str = Field(description="English summary of the complaint")
    subject_line: str = Field(description="Subject line in Kannada")
    addressee: str = Field(
        default="ಮಾನ್ಯ ಆಯುಕ್ತರು, ಬೃಹತ್ ಬೆಂಗಳೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ",
        description="Default addressee — BBMP Commissioner",
    )


class SahayaResult(BaseModel):
    """
    Top-level structured JSON returned by the SahayaVoice agent.
    This is the final deliverable after all clarification rounds.
    """
    status: Literal["complete", "needs_clarification", "failed"] = "complete"
    intent: ExtractedIntent
    complaint_letter: ComplaintLetter | None = None
    clarification_question: str | None = Field(
        None,
        description="Next question to ask the user (multilingual)",
    )
    rounds_taken: int = 0
    error: str | None = None
