"""
SahayaVoice – LLM Agent & Kannada Document Generation module
Owner: Member 6 (AI Agent & Kannada Document Generation)
Scaffold by: Member 1 (Task 1)

Responsibilities:
  - Receive transcript + detected language from M4's STT module
  - Extract civic/legal intent (BESCOM | BWSSB | BBMP | Rental | Other)
  - Detect missing information (Ward/Area, Account ID, issue specifics)
  - Run multilingual clarification loop (ask follow-up questions in user's language)
  - Generate formal Kannada complaint/petition letter
  - Return structured JSON for M5's API layer and M7's output module

API contract (for M5 to wire into FastAPI router):
  POST /api/process-voice
  Body JSON:
  {
    "transcript":  "<user's spoken text>",
    "language":    "<kn|hi|ta|te|en|mixed>",
    "session_id":  "<uuid>",           // for multi-turn clarification
    "context":     [<prior turns>]     // optional, for follow-up requests
  }
  Response JSON:
  {
    "action":          "clarify | generate",
    "clarify_question": "<question in user's language>",  // when action=clarify
    "intent":          "<BESCOM | BWSSB | BBMP | Rental | Other>",
    "kannada_letter":  "<formal Kannada complaint text>", // when action=generate
    "summary":         "<brief summary in user's language>",
    "next_steps":      "<what the user should do next>"
  }
"""

from __future__ import annotations

from typing import Literal

from prompts import (
    SYSTEM_PROMPT_INTENT_EXTRACTION,
    SYSTEM_PROMPT_KANNADA_LETTER,
    SYSTEM_PROMPT_CLARIFICATION,
)

# ---------------------------------------------------------------------------
# Type alias
# ---------------------------------------------------------------------------
Intent = Literal["BESCOM", "BWSSB", "BBMP", "Rental", "Other"]
AgentAction = Literal["clarify", "generate"]


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
        language:    Detected ISO language code.
        session_id:  Session UUID for multi-turn state.
        context:     List of prior conversation turns (for clarification loop).

    Returns:
        AgentResponse – either a clarifying question or the generated Kannada letter.

    TODO (M6):
      1. Connect to IBM Granite / watsonx.ai (or GPT-4o) using WATSONX_API_KEY.
      2. Use SYSTEM_PROMPT_INTENT_EXTRACTION to extract intent and missing fields.
      3. If fields are missing, use SYSTEM_PROMPT_CLARIFICATION to generate a follow-up.
      4. Once all fields collected, use SYSTEM_PROMPT_KANNADA_LETTER to draft letter.
      5. Maintain session context across turns (store in memory/Redis keyed by session_id).
    """
    raise NotImplementedError(
        "M6 – please implement process_voice_input() in backend/pipeline/llm_agent.py"
    )
