"""
SahayaVoice – LLM Agent & Kannada Document Generation module
Owner: Member 6 (AI Agent & Kannada Document Generation)

- Receives transcript + detected language from STT module
- Extracts civic/legal intent using IBM Granite / watsonx.ai (primary) or GPT-4o (fallback)
- Detects missing information and runs multilingual clarification loop
- Generates formal Kannada complaint/petition letter
- Maintains multi-turn session state in memory (keyed by session_id)
- Returns structured AgentResponse JSON
"""

from __future__ import annotations

import json
import logging
import os
from typing import Literal

from prompts import (
    SYSTEM_PROMPT_CLARIFICATION,
    SYSTEM_PROMPT_INTENT_EXTRACTION,
    SYSTEM_PROMPT_KANNADA_LETTER,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------
Intent = Literal["BESCOM", "BWSSB", "BBMP", "Rental", "Other"]
AgentAction = Literal["clarify", "generate"]

# ---------------------------------------------------------------------------
# In-memory session store  { session_id: { "extracted": {...}, "intent": ... } }
# ---------------------------------------------------------------------------
_SESSION_STORE: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Data class
# ---------------------------------------------------------------------------
class AgentResponse:
    """Structured output from the LLM agent."""

    def __init__(
        self,
        action: AgentAction,
        intent: Intent | None = None,
        clarify_question: str | None = None,
        kannada_letter: str | None = None,
        summary: str | None = None,
        next_steps: str | None = None,
    ):
        self.action = action
        self.intent = intent
        self.clarify_question = clarify_question
        self.kannada_letter = kannada_letter
        self.summary = summary
        self.next_steps = next_steps

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "intent": self.intent,
            "clarify_question": self.clarify_question,
            "kannada_letter": self.kannada_letter,
            "summary": self.summary,
            "next_steps": self.next_steps,
        }


# ---------------------------------------------------------------------------
# LLM provider helpers
# ---------------------------------------------------------------------------

def _chat_watsonx(system_prompt: str, user_message: str) -> str:
    """Call IBM Granite via watsonx.ai."""
    from ibm_watsonx_ai import APIClient, Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference

    creds = Credentials(
        url=os.environ.get("WATSONX_URL", "https://us-south.ml.cloud.ibm.com"),
        api_key=os.environ["WATSONX_API_KEY"],
    )
    client = APIClient(credentials=creds, project_id=os.environ["WATSONX_PROJECT_ID"])
    model = ModelInference(
        model_id="ibm/granite-13b-instruct-v2",
        api_client=client,
        params={"max_new_tokens": 1024, "temperature": 0.3},
    )
    prompt = f"<|system|>\n{system_prompt}\n<|user|>\n{user_message}\n<|assistant|>\n"
    result = model.generate_text(prompt=prompt)
    return result.strip()


def _chat_openai(system_prompt: str, user_message: str) -> str:
    """Call GPT-4o via OpenAI (fallback)."""
    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
        max_tokens=1024,
    )
    return response.choices[0].message.content.strip()


def _llm_call(system_prompt: str, user_message: str) -> str:
    """Route to watsonx.ai (preferred) or OpenAI (fallback)."""
    if os.environ.get("WATSONX_API_KEY") and os.environ.get("WATSONX_PROJECT_ID"):
        logger.info("LLM: using IBM Granite / watsonx.ai")
        return _chat_watsonx(system_prompt, user_message)
    if os.environ.get("OPENAI_API_KEY"):
        logger.info("LLM: using OpenAI GPT-4o (fallback)")
        return _chat_openai(system_prompt, user_message)
    raise EnvironmentError(
        "No LLM provider configured. Set WATSONX_API_KEY+WATSONX_PROJECT_ID or OPENAI_API_KEY."
    )


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def _extract_intent(transcript: str, language: str) -> dict:
    """
    Call the LLM to extract intent and fields from the transcript.
    Returns the parsed JSON dict from the model.
    """
    raw = _llm_call(
        system_prompt=SYSTEM_PROMPT_INTENT_EXTRACTION,
        user_message=f"Language: {language}\nTranscript: {transcript}",
    )
    # Strip any markdown fences the model might add
    cleaned = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    return json.loads(cleaned)


def _ask_clarification(missing_field: str, language: str) -> str:
    """Generate a one-sentence clarifying question in the user's language."""
    prompt = SYSTEM_PROMPT_CLARIFICATION.format(
        missing_field=missing_field, language=language
    )
    return _llm_call(system_prompt=prompt, user_message="Ask the question.")


def _generate_kannada_letter(intent: str, extracted: dict, language: str) -> str:
    """Generate the full Kannada letter + English summary + Next Steps."""
    prompt = SYSTEM_PROMPT_KANNADA_LETTER.format(
        intent=intent,
        area=extracted.get("area") or "Not specified",
        account_id=extracted.get("account_id") or "Not provided",
        issue_description=extracted.get("issue_description") or "Not specified",
        language=language,
    )
    return _llm_call(system_prompt=prompt, user_message="Generate the letter.")


def _parse_letter_sections(raw_letter: str) -> tuple[str, str, str]:
    """
    Split the raw LLM output into (kannada_letter, summary, next_steps).
    The prompts.py contract uses delimiter lines '--- ENGLISH SUMMARY ---'
    and '--- NEXT STEPS ---'.
    """
    summary_marker = "--- ENGLISH SUMMARY ---"
    steps_marker = "--- NEXT STEPS ---"

    if summary_marker in raw_letter:
        parts = raw_letter.split(summary_marker, 1)
        kannada_part = parts[0].strip()
        rest = parts[1]
    else:
        kannada_part = raw_letter.strip()
        rest = ""

    if steps_marker in rest:
        summary_part, steps_part = rest.split(steps_marker, 1)
    else:
        summary_part = rest
        steps_part = ""

    return kannada_part, summary_part.strip(), steps_part.strip()


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def process_voice_input(
    transcript: str,
    language: str,
    session_id: str,
    context: list[dict] | None = None,
) -> AgentResponse:
    """
    Core LLM agent pipeline.

    Args:
        transcript:  Transcribed text from STT.
        language:    Detected ISO language code (kn/hi/ta/te/en/mixed).
        session_id:  Session UUID for multi-turn state.
        context:     List of prior conversation turns (optional).

    Returns:
        AgentResponse – either a clarifying question or the generated Kannada letter.
    """
    # Retrieve or initialise session state
    session = _SESSION_STORE.setdefault(session_id, {"extracted": {}, "intent": None})

    # Step 1: Extract intent & fields from transcript
    try:
        intent_data = _extract_intent(transcript, language)
    except (json.JSONDecodeError, Exception) as exc:
        logger.error("Intent extraction failed: %s", exc)
        # Treat as 'Other' intent with no fields
        intent_data = {
            "intent": "Other",
            "extracted": {},
            "missing_fields": ["issue_description"],
        }

    intent: str = intent_data.get("intent", "Other")
    extracted: dict = intent_data.get("extracted", {})
    missing: list[str] = intent_data.get("missing_fields", [])

    # Merge newly extracted fields into the session
    for k, v in extracted.items():
        if v:
            session["extracted"][k] = v
    if intent and intent != "Other":
        session["intent"] = intent

    # Recompute missing against accumulated session data
    still_missing = [
        f for f in missing
        if not session["extracted"].get(f)
    ]

    # Step 2: If key fields are still missing, ask a clarifying question
    if still_missing:
        question = _ask_clarification(still_missing[0], language)
        return AgentResponse(
            action="clarify",
            intent=session["intent"] or intent,
            clarify_question=question,
        )

    # Step 3: All fields collected – generate the Kannada letter
    final_intent = session["intent"] or intent
    raw_letter = _generate_kannada_letter(
        intent=final_intent,
        extracted=session["extracted"],
        language=language,
    )
    kannada_letter, summary, next_steps = _parse_letter_sections(raw_letter)

    # Clean up session after successful generation
    _SESSION_STORE.pop(session_id, None)

    return AgentResponse(
        action="generate",
        intent=final_intent,
        kannada_letter=kannada_letter,
        summary=summary,
        next_steps=next_steps,
    )
