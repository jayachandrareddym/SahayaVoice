"""
SahayaVoice test suite.

Tests are split into:
  Unit tests  — pure logic, no LLM calls (detector, schema, clarifier helpers)
  Integration — mocked LLM, exercises the full agent pipeline

Run with:
  pytest backend/tests/test_sahaya.py -v
"""
from __future__ import annotations

import json
import pytest
from unittest.mock import AsyncMock, patch

from pipeline.sahaya.schema import (
    ComplaintCategory,
    ExtractedIntent,
    ClarificationState,
    MissingField,
    REQUIRED_FIELDS,
)
from pipeline.sahaya.detector import detect_missing, is_complete
from pipeline.sahaya.clarifier import (
    build_clarification_question,
    initial_state,
)
from pipeline.sahaya.agent import SahayaSession


# ═══════════════════════════════════════════════════════════════════════════════
# Unit tests — detector
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectMissing:
    def _full_intent(self) -> ExtractedIntent:
        return ExtractedIntent(
            category=ComplaintCategory.ROAD_DAMAGE,
            location="12th Main, Rajajinagar, Bengaluru",
            description="Large pothole causing accidents for 2 weeks",
            complainant_name="Ravi Kumar",
            contact_number="9876543210",
            detected_language="kannada",
        )

    def test_no_missing_on_full_intent(self):
        intent = self._full_intent()
        assert detect_missing(intent) == []
        assert is_complete(intent) is True

    def test_all_required_fields_missing(self):
        intent = ExtractedIntent()
        missing = detect_missing(intent)
        missing_fields = [m.field for m in missing]
        for f in REQUIRED_FIELDS:
            assert f in missing_fields

    def test_partial_missing(self):
        intent = self._full_intent()
        intent.location = None
        intent.contact_number = None
        missing = detect_missing(intent)
        assert {m.field for m in missing} == {"location", "contact_number"}

    def test_missing_field_has_all_language_prompts(self):
        intent = ExtractedIntent()
        missing = detect_missing(intent)
        for m in missing:
            assert m.prompt_kannada
            assert m.prompt_hindi
            assert m.prompt_english

    def test_is_complete_false_when_missing(self):
        intent = ExtractedIntent(
            category=ComplaintCategory.WATER_SUPPLY,
            location="BTM Layout",
            description="No water supply for 3 days",
            complainant_name="Sudha Rao",
            # contact_number missing
        )
        assert is_complete(intent) is False


# ═══════════════════════════════════════════════════════════════════════════════
# Unit tests — clarifier helpers
# ═══════════════════════════════════════════════════════════════════════════════

class TestClarifier:
    def _partial_intent(self) -> ExtractedIntent:
        return ExtractedIntent(
            category=ComplaintCategory.ELECTRICITY,
            description="Power outage since yesterday",
            detected_language="kannada",
        )

    def test_initial_state_detects_missing(self):
        intent = self._partial_intent()
        state = initial_state(intent)
        assert state.complete is False
        assert len(state.missing) > 0

    def test_build_question_returns_kannada_for_kannada_speaker(self):
        intent = self._partial_intent()
        state = initial_state(intent)
        question = build_clarification_question(state)
        assert question is not None
        # Kannada script contains characters in range U+0C80–U+0CFF
        assert any("\u0C80" <= ch <= "\u0CFF" for ch in question), (
            f"Expected Kannada script in: {question!r}"
        )

    def test_no_question_when_complete(self):
        intent = ExtractedIntent(
            category=ComplaintCategory.ROAD_DAMAGE,
            location="MG Road",
            description="Broken road",
            complainant_name="Anita",
            contact_number="9988776655",
        )
        state = initial_state(intent)
        assert state.complete is True
        assert build_clarification_question(state) is None

    def test_english_prompt_for_english_speaker(self):
        intent = ExtractedIntent(
            category=ComplaintCategory.SANITATION,
            detected_language="english",
        )
        state = initial_state(intent)
        question = build_clarification_question(state)
        # English prompt should be ASCII-dominant
        assert question is not None
        ascii_ratio = sum(1 for c in question if ord(c) < 128) / len(question)
        assert ascii_ratio > 0.8, f"Expected mostly ASCII in: {question!r}"


# ═══════════════════════════════════════════════════════════════════════════════
# Unit tests — SahayaSession dataclass
# ═══════════════════════════════════════════════════════════════════════════════

class TestSahayaSession:
    def test_default_state(self):
        s = SahayaSession()
        assert s.clarification_state is None
        assert s.rounds == 0
        assert s.letter_generated is False

    def test_fresh_session_per_complaint(self):
        s1 = SahayaSession()
        s2 = SahayaSession()
        assert s1 is not s2


# ═══════════════════════════════════════════════════════════════════════════════
# Integration tests — mocked LLM
# ═══════════════════════════════════════════════════════════════════════════════

# Minimal Granite JSON responses for mocking

_INTENT_JSON = json.dumps({
    "category": "road_damage",
    "location": "Vijayanagar, Bengaluru",
    "description": "Large pothole on main road",
    "complainant_name": "Priya Sharma",
    "contact_number": "9123456789",
    "date_of_incident": "2024-11-15",
    "urgency": "high",
    "detected_language": "kannada",
})

_KANNADA_LETTER = (
    "ಮಾನ್ಯ ಆಯುಕ್ತರು,\nಬೃಹತ್ ಬೆಂಗಳೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ\n\n"
    "ವಿಷಯ: ರಸ್ತೆ ಹಾನಿ ಬಗ್ಗೆ ದೂರು\n\nಮಾನ್ಯರೇ,\n"
    "ವಿಜಯನಗರ ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಹಳ್ಳ ಇದ್ದು ಅಪಘಾತಗಳಾಗುತ್ತಿವೆ.\n\n"
    "ನಿಮ್ಮ ವಿಶ್ವಾಸಿ,\nಪ್ರಿಯಾ ಶರ್ಮಾ\n9123456789"
)

_SUBJECT = "ರಸ್ತೆ ಹಾನಿ ಬಗ್ಗೆ ದೂರು — ವಿಜಯನಗರ"
_SUMMARY = "Complaint about road damage at Vijayanagar, Bengaluru filed by Priya Sharma."


def _make_mock_complete(responses: list[str]):
    """Return an AsyncMock that cycles through the given responses."""
    call_count = {"n": 0}

    async def _mock(*args, **kwargs):
        idx = min(call_count["n"], len(responses) - 1)
        call_count["n"] += 1
        return responses[idx]

    return _mock


@pytest.mark.asyncio
class TestAgentIntegration:
    async def test_process_full_text_returns_complete(self):
        """Single-shot: full complaint → returns complete SahayaResult with letter."""
        from pipeline.sahaya.agent import process_full_text

        with patch(
            "pipeline.sahaya.intent.complete",
            new=_make_mock_complete([_INTENT_JSON]),
        ), patch(
            "pipeline.sahaya.letter.complete",
            new=_make_mock_complete([_SUBJECT, _KANNADA_LETTER, _SUMMARY]),
        ):
            result = await process_full_text(
                "ವಿಜಯನಗರ ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಹಳ್ಳ ಇದೆ. ಅಪಘಾತಗಳಾಗುತ್ತಿವೆ."
            )

        assert result.status == "complete"
        assert result.intent.category == ComplaintCategory.ROAD_DAMAGE
        assert result.intent.location == "Vijayanagar, Bengaluru"
        assert result.complaint_letter is not None
        assert result.complaint_letter.kannada_letter == _KANNADA_LETTER
        assert result.complaint_letter.subject_line == _SUBJECT

    async def test_process_full_text_empty_input(self):
        """Empty text must return failed status without calling the LLM."""
        from pipeline.sahaya.agent import process_full_text

        result = await process_full_text("")
        assert result.status == "failed"
        assert result.error is not None

    async def test_multi_turn_needs_clarification_then_complete(self):
        """
        Turn 1: partial complaint (no name/phone) → needs_clarification
        Turn 2: provides name and phone → complete
        """
        from pipeline.sahaya.agent import process_utterance

        partial_intent_json = json.dumps({
            "category": "water_supply",
            "location": "BTM Layout",
            "description": "No water for 3 days",
            "complainant_name": None,
            "contact_number": None,
            "urgency": "high",
            "detected_language": "kannada",
        })

        full_intent_json = json.dumps({
            "category": "water_supply",
            "location": "BTM Layout",
            "description": "No water for 3 days",
            "complainant_name": "Meena Devi",
            "contact_number": "9000011111",
            "urgency": "high",
            "detected_language": "kannada",
        })

        session = SahayaSession()

        # Turn 1
        with patch(
            "pipeline.sahaya.intent.complete",
            new=_make_mock_complete([partial_intent_json]),
        ):
            r1 = await process_utterance("BTM Layout ನಲ್ಲಿ 3 ದಿನಗಳಿಂದ ನೀರು ಇಲ್ಲ", session)

        assert r1.status == "needs_clarification"
        assert r1.clarification_question is not None

        # Turn 2 — user provides name + phone
        with patch(
            "pipeline.sahaya.intent.complete",
            new=_make_mock_complete([full_intent_json]),
        ), patch(
            "pipeline.sahaya.letter.complete",
            new=_make_mock_complete([_SUBJECT, _KANNADA_LETTER, _SUMMARY]),
        ):
            r2 = await process_utterance("ನನ್ನ ಹೆಸರು ಮೀನಾ ದೇವಿ, ಮೊಬೈಲ್ 9000011111", session)

        assert r2.status == "complete"
        assert r2.complaint_letter is not None
        assert r2.intent.complainant_name == "Meena Devi"

    async def test_sahaya_result_serializes_to_valid_json(self):
        """SahayaResult must serialize cleanly to JSON (no Enum issues, etc.)."""
        from pipeline.sahaya.agent import process_full_text

        with patch(
            "pipeline.sahaya.intent.complete",
            new=_make_mock_complete([_INTENT_JSON]),
        ), patch(
            "pipeline.sahaya.letter.complete",
            new=_make_mock_complete([_SUBJECT, _KANNADA_LETTER, _SUMMARY]),
        ):
            result = await process_full_text("Road is broken at Vijayanagar")

        raw_json = result.model_dump_json()
        parsed = json.loads(raw_json)

        assert parsed["status"] == "complete"
        assert "complaint_letter" in parsed
        assert parsed["complaint_letter"]["kannada_letter"]
        assert parsed["intent"]["category"] == "road_damage"
