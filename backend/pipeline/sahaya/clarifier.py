"""
Multilingual clarification loop module.

Drives a conversational loop that:
  1. Checks for missing required fields.
  2. Builds a clarification question in the user's detected language.
  3. Accepts the user's answer, merges it back into the intent.
  4. Repeats until all fields are filled or max rounds is reached.

The loop can run in two modes:
  - step()   : one round at a time (call from an async WebSocket handler)
  - run_loop(): fully autonomous loop given a callable user_input function
                (useful for HTTP/REST and test harnesses)
"""
from __future__ import annotations

import logging
from typing import Callable, Awaitable

from ..config import get_settings
from .schema import ClarificationState, ExtractedIntent, MissingField
from .detector import detect_missing, is_complete
from .intent import merge_intent

logger = logging.getLogger(__name__)


# ── Language selection ────────────────────────────────────────────────────────

def _pick_prompt(field: MissingField, language: str) -> str:
    """Return the clarification question in the preferred language."""
    if language == "hindi":
        return field.prompt_hindi
    if language == "english":
        return field.prompt_english
    # Default: Kannada
    return field.prompt_kannada


def _effective_language(intent: ExtractedIntent, default_lang: str) -> str:
    """Use the detected language if available, otherwise the configured default."""
    detected = intent.detected_language
    if detected and detected != "unknown":
        return detected
    return default_lang


# ── Single-step interface ─────────────────────────────────────────────────────

def build_clarification_question(state: ClarificationState) -> str | None:
    """
    Given the current ClarificationState, return the next question to ask.
    Returns None if no more questions are needed.
    """
    if state.complete or not state.missing:
        return None

    cfg = get_settings()
    lang = _effective_language(state.intent, cfg.sahaya_lang)
    next_field = state.missing[0]
    return _pick_prompt(next_field, lang)


async def apply_answer(state: ClarificationState, user_answer: str) -> ClarificationState:
    """
    Merge the user's answer into the intent and re-detect missing fields.
    Returns an updated ClarificationState.
    """
    cfg = get_settings()

    updated_intent = await merge_intent(state.intent, user_answer)
    missing = detect_missing(updated_intent)
    complete = is_complete(updated_intent) or state.round + 1 >= cfg.sahaya_max_clarify

    return ClarificationState(
        intent=updated_intent,
        missing=missing,
        round=state.round + 1,
        complete=complete,
    )


def initial_state(intent: ExtractedIntent) -> ClarificationState:
    """Create a fresh ClarificationState from an initial ExtractedIntent."""
    missing = detect_missing(intent)
    return ClarificationState(
        intent=intent,
        missing=missing,
        round=0,
        complete=is_complete(intent),
    )


# ── Autonomous loop interface (for REST / tests) ──────────────────────────────

async def run_loop(
    intent: ExtractedIntent,
    user_input_fn: Callable[[str], Awaitable[str]],
) -> ClarificationState:
    """
    Run the full clarification loop autonomously.

    Args:
        intent:        Initial ExtractedIntent (may have missing fields).
        user_input_fn: Async callable that receives a question string and
                       returns the user's answer string.

    Returns the final ClarificationState (complete=True when all fields filled).
    """
    state = initial_state(intent)

    while not state.complete:
        question = build_clarification_question(state)
        if not question:
            break

        logger.info(
            "Clarification round %d — asking: %r",
            state.round + 1,
            question[:100],
        )
        answer = await user_input_fn(question)
        if not answer or not answer.strip():
            logger.info("Empty answer received — stopping clarification loop.")
            break

        state = await apply_answer(state, answer)

    state = ClarificationState(
        intent=state.intent,
        missing=state.missing,
        round=state.round,
        complete=True,  # mark done regardless so caller can proceed
    )
    logger.info(
        "Clarification loop finished after %d round(s). Fields remaining: %s",
        state.round,
        [m.field for m in state.missing],
    )
    return state
