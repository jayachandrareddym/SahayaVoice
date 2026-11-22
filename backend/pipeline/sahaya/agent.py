"""
SahayaVoice Agent — top-level orchestration entry-point.

Public API
----------
process_utterance(text, session) -> SahayaResult
    One-shot call per utterance from the voice pipeline.
    Maintains session state across turns.

process_full_text(text) -> SahayaResult
    Autonomous single-shot call with no interactive loop.
    Useful for REST API and batch processing.

Both functions always return a SahayaResult (structured JSON).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from .schema import (
    ClarificationState,
    ExtractedIntent,
    SahayaResult,
)
from .intent import extract_intent, merge_intent
from .detector import detect_missing, is_complete
from .clarifier import (
    build_clarification_question,
    apply_answer,
    initial_state,
)
from .letter import generate_letter

logger = logging.getLogger(__name__)


# ── Session state (kept per WebSocket connection) ─────────────────────────────

@dataclass
class SahayaSession:
    """
    Mutable per-connection state.  Store one of these per WebSocket client.
    Reset with SahayaSession() to start a fresh complaint.
    """
    clarification_state: ClarificationState | None = None
    rounds: int = 0
    # Flag: True once a letter has been generated for this complaint
    letter_generated: bool = False


# ── Multi-turn voice pipeline interface ──────────────────────────────────────

async def process_utterance(
    user_text: str,
    session: SahayaSession,
) -> SahayaResult:
    """
    Process one utterance within an ongoing voice session.

    Turn 1  — fresh complaint text  → extract intent, detect missing fields,
                                      return first clarification question.
    Turn 2+ — clarification answer  → merge into existing intent, check again.
    Final   — all fields present    → generate letter, return SahayaResult.
    """
    if not user_text.strip():
        return SahayaResult(
            status="failed",
            intent=ExtractedIntent(),
            error="Empty input received.",
        )

    try:
        # ── First turn: extract from scratch ──────────────────────────────
        if session.clarification_state is None:
            logger.info("[SahayaVoice] New session — extracting intent")
            intent = await extract_intent(user_text)
            session.clarification_state = initial_state(intent)
        else:
            # ── Subsequent turns: merge answer into existing intent ────────
            logger.info("[SahayaVoice] Round %d — merging answer", session.rounds + 1)
            session.clarification_state = await apply_answer(
                session.clarification_state, user_text
            )

        session.rounds += 1
        state = session.clarification_state

        # ── Check if all required fields are now present ──────────────────
        if is_complete(state.intent):
            logger.info("[SahayaVoice] All fields complete — generating letter")
            letter = await generate_letter(state.intent)
            session.letter_generated = True
            return SahayaResult(
                status="complete",
                intent=state.intent,
                complaint_letter=letter,
                rounds_taken=session.rounds,
            )

        # ── Still missing fields — build next clarification question ──────
        question = build_clarification_question(state)
        if not question:
            # Shouldn't happen, but generate with what we have
            letter = await generate_letter(state.intent)
            return SahayaResult(
                status="complete",
                intent=state.intent,
                complaint_letter=letter,
                rounds_taken=session.rounds,
            )

        return SahayaResult(
            status="needs_clarification",
            intent=state.intent,
            clarification_question=question,
            rounds_taken=session.rounds,
        )

    except Exception as exc:
        logger.exception("[SahayaVoice] Agent error: %s", exc)
        return SahayaResult(
            status="failed",
            intent=session.clarification_state.intent
            if session.clarification_state
            else ExtractedIntent(),
            error=str(exc),
        )


# ── Single-shot REST / batch interface ───────────────────────────────────────

async def process_full_text(user_text: str) -> SahayaResult:
    """
    Extract intent and generate a complaint letter in a single call.
    No interactive clarification — fields that cannot be inferred are left
    as "not specified" and the letter is still generated.
    """
    if not user_text.strip():
        return SahayaResult(
            status="failed",
            intent=ExtractedIntent(),
            error="Empty input received.",
        )

    try:
        logger.info("[SahayaVoice] Single-shot processing")
        intent = await extract_intent(user_text)
        letter = await generate_letter(intent)
        missing = detect_missing(intent)
        status: str = "complete" if not missing else "complete"  # always generate

        return SahayaResult(
            status="complete",
            intent=intent,
            complaint_letter=letter,
            rounds_taken=1,
        )
    except Exception as exc:
        logger.exception("[SahayaVoice] Single-shot error: %s", exc)
        return SahayaResult(
            status="failed",
            intent=ExtractedIntent(),
            error=str(exc),
        )
