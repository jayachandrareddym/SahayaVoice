"""
Intent extraction module.

Given raw user speech (text), asks IBM Granite to extract structured complaint
intent fields and return them as an ExtractedIntent.

The extractor is designed to be called repeatedly:  each new user utterance is
merged with the previously extracted intent so incremental information accumulates
across clarification rounds.
"""
from __future__ import annotations

import json
import logging
import re

from ..llm import complete
from .schema import ComplaintCategory, ExtractedIntent

logger = logging.getLogger(__name__)

# ── System prompt for Granite intent extraction ───────────────────────────────

_INTENT_SYSTEM = """\
You are a civic complaint intake assistant for Karnataka, India.
Your job is to extract structured information from a citizen's spoken complaint.

Extract ONLY information explicitly stated. Use null for unknown fields.

Respond with VALID JSON only — no explanation, no markdown fences, no extra text.

JSON schema:
{
  "category": one of ["water_supply","road_damage","electricity","sanitation",
                       "street_light","garbage_collection","drainage",
                       "noise_pollution","other"] or null,
  "location": string or null,
  "description": string or null,
  "complainant_name": string or null,
  "contact_number": string or null,
  "date_of_incident": string or null,
  "urgency": one of ["low","medium","high","critical"],
  "detected_language": one of ["kannada","hindi","english","unknown"]
}
"""

_MERGE_SYSTEM = """\
You are a data-merging assistant.
You will receive two JSON objects representing partial civic complaint data.
Merge them: prefer non-null values from the NEW object over the EXISTING object.
If the new object provides a value for a field that is null in the existing object, use it.
Respond with the merged VALID JSON only — no explanation, no markdown fences.
"""


def _extract_json(raw: str) -> dict:
    """Strip markdown fences and extract the first JSON object from raw text."""
    # Remove ```json ... ``` or ``` ... ```
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    # Find the first {...}
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM response: {raw!r}")
    return json.loads(match.group(0))


async def extract_intent(user_text: str) -> ExtractedIntent:
    """
    Call Granite to extract intent fields from a single utterance.
    Returns an ExtractedIntent (fields may be None).
    """
    logger.info("Extracting intent from: %r", user_text[:120])

    raw = await complete(
        prompt=user_text,
        system_override=_INTENT_SYSTEM,
        max_tokens=512,
        temperature=0.1,
    )

    try:
        data = _extract_json(raw)
    except (ValueError, json.JSONDecodeError) as exc:
        logger.warning("Intent extraction JSON parse failed: %s — raw: %r", exc, raw[:200])
        data = {}

    # Validate & coerce category
    if data.get("category") not in [c.value for c in ComplaintCategory]:
        data["category"] = None

    intent = ExtractedIntent(
        category=data.get("category"),
        location=data.get("location"),
        description=data.get("description"),
        complainant_name=data.get("complainant_name"),
        contact_number=data.get("contact_number"),
        date_of_incident=data.get("date_of_incident"),
        urgency=data.get("urgency", "medium"),
        detected_language=data.get("detected_language", "unknown"),
        raw_input=user_text,
    )
    logger.info("Extracted intent: %s", intent.model_dump_json(exclude_none=True))
    return intent


async def merge_intent(existing: ExtractedIntent, new_text: str) -> ExtractedIntent:
    """
    Extract intent from new_text and merge into the existing ExtractedIntent.
    Fields already populated in existing are preserved unless new_text overrides.
    """
    new_intent = await extract_intent(new_text)

    # Merge: new non-None values win; accumulate raw_input
    merged_data = existing.model_dump()
    for field, value in new_intent.model_dump().items():
        if field == "raw_input":
            # Concatenate
            merged_data["raw_input"] = (merged_data["raw_input"] + "\n" + value).strip()
        elif value is not None and merged_data.get(field) is None:
            merged_data[field] = value
        elif field == "urgency" and value != "medium":
            # Let a more explicit urgency override the default
            merged_data[field] = value
        elif field == "detected_language" and value != "unknown":
            merged_data[field] = value

    return ExtractedIntent(**merged_data)
