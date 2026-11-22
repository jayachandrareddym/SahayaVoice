"""
SahayaVoice – Speech-to-Text (STT) pipeline module
Owner: Member 4 (STT & Language Detection)
Scaffold by: Member 1 (Task 1)

Responsibilities:
  - Accept raw audio bytes (WAV / WebM / OGG)
  - Transcribe using Whisper or Sarvam AI (saarika) / Bhashini
  - Detect spoken language: Kannada, Hindi, Tamil, Telugu, English, Kanglish
  - Return clean transcript + detected language code

API contract (for M5 to wire into FastAPI router):
  POST /api/transcribe
  Body: multipart/form-data  { audio: <file> }
  Response JSON:
  {
    "transcript": "<raw spoken text>",
    "language":   "<ISO code: kn | hi | ta | te | en | mixed>",
    "confidence": 0.0–1.0
  }
"""

from __future__ import annotations

from typing import Literal

# ---------------------------------------------------------------------------
# Type alias – update when adding new language codes
# ---------------------------------------------------------------------------
LanguageCode = Literal["kn", "hi", "ta", "te", "en", "mixed"]


class TranscriptResult:
    """Structured output from the STT pipeline."""

    def __init__(self, transcript: str, language: LanguageCode, confidence: float):
        self.transcript = transcript
        self.language = language
        self.confidence = confidence

    def to_dict(self) -> dict:
        return {
            "transcript": self.transcript,
            "language": self.language,
            "confidence": self.confidence,
        }


def transcribe_audio(audio_bytes: bytes, hint_language: str | None = None) -> TranscriptResult:
    """
    Transcribe raw audio and detect language.

    Args:
        audio_bytes:    Raw audio file bytes (WAV / WebM / OGG).
        hint_language:  Optional ISO language code hint from the UI language selector.

    Returns:
        TranscriptResult with transcript, detected language, and confidence.

    TODO (M4):
      1. Integrate OpenAI Whisper (whisper-large-v3) or Sarvam saarika endpoint.
      2. Post-process transcript to normalise Kanglish / code-mixed text.
      3. Use hint_language to bias language detection when provided.
    """
    raise NotImplementedError(
        "M4 – please implement transcribe_audio() in backend/pipeline/stt.py"
    )
