"""
SahayaVoice – Speech-to-Text (STT) pipeline module
Owner: Member 4 (STT & Language Detection)

- Accepts raw audio bytes (WAV / WebM / OGG)
- Primary:  OpenAI Whisper (whisper-1) via API
- Fallback: Sarvam AI saarika endpoint
- Detects language: Kannada, Hindi, Tamil, Telugu, English, Kanglish/mixed
- Returns clean transcript + detected language code + confidence
"""

from __future__ import annotations

import os
import io
import logging
from typing import Literal

import httpx
from openai import OpenAI

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Type alias
# ---------------------------------------------------------------------------
LanguageCode = Literal["kn", "hi", "ta", "te", "en", "mixed"]

# Whisper language names → ISO codes we use
_WHISPER_LANG_MAP: dict[str, LanguageCode] = {
    "kannada":  "kn",
    "hindi":    "hi",
    "tamil":    "ta",
    "telugu":   "te",
    "english":  "en",
}

# Sarvam language codes
_SARVAM_LANG_MAP: dict[str, LanguageCode] = {
    "kn-IN": "kn",
    "hi-IN": "hi",
    "ta-IN": "ta",
    "te-IN": "te",
    "en-IN": "en",
}


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


def _detect_language(whisper_lang: str | None) -> LanguageCode:
    """Map Whisper's detected language name/code to our internal LanguageCode."""
    if not whisper_lang:
        return "en"
    key = whisper_lang.lower()
    # Try full name first, then 2-char ISO prefix
    return _WHISPER_LANG_MAP.get(key) or _WHISPER_LANG_MAP.get(key[:2]) or "mixed"


def _transcribe_whisper(audio_bytes: bytes, hint_language: str | None) -> TranscriptResult:
    """Transcribe using OpenAI Whisper API."""
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.webm"

    kwargs: dict = {"model": "whisper-1", "file": audio_file, "response_format": "verbose_json"}
    if hint_language:
        # Map our code to a Whisper-accepted ISO 639-1 code
        kwargs["language"] = hint_language if len(hint_language) == 2 else hint_language[:2]

    response = client.audio.transcriptions.create(**kwargs)
    detected = _detect_language(getattr(response, "language", None))
    return TranscriptResult(
        transcript=response.text.strip(),
        language=detected,
        confidence=0.95,  # Whisper doesn't expose a per-segment confidence in the simple API
    )


def _transcribe_sarvam(audio_bytes: bytes, hint_language: str | None) -> TranscriptResult:
    """Transcribe using Sarvam AI saarika endpoint (fallback)."""
    api_key = os.environ.get("SARVAM_API_KEY", "")
    # Sarvam expects language_code like "kn-IN"
    lang_code = f"{hint_language}-IN" if hint_language else "kn-IN"

    with httpx.Client(timeout=30) as client:
        response = client.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": api_key},
            files={"file": ("audio.webm", audio_bytes, "audio/webm")},
            data={"language_code": lang_code, "model": "saarika:v1"},
        )
        response.raise_for_status()
        data = response.json()

    detected_raw = data.get("language_code", lang_code)
    detected = _SARVAM_LANG_MAP.get(detected_raw, "mixed")
    return TranscriptResult(
        transcript=data.get("transcript", "").strip(),
        language=detected,
        confidence=data.get("confidence", 0.85),
    )


def transcribe_audio(audio_bytes: bytes, hint_language: str | None = None) -> TranscriptResult:
    """
    Transcribe raw audio and detect language.

    Tries OpenAI Whisper first; falls back to Sarvam AI if OPENAI_API_KEY is absent.

    Args:
        audio_bytes:    Raw audio file bytes (WAV / WebM / OGG).
        hint_language:  Optional ISO language code hint from the UI language selector.

    Returns:
        TranscriptResult with transcript, detected language, and confidence.
    """
    if os.environ.get("OPENAI_API_KEY"):
        logger.info("STT: using OpenAI Whisper")
        return _transcribe_whisper(audio_bytes, hint_language)

    if os.environ.get("SARVAM_API_KEY"):
        logger.info("STT: using Sarvam AI saarika (Whisper key not set)")
        return _transcribe_sarvam(audio_bytes, hint_language)

    raise EnvironmentError(
        "No STT provider configured. Set OPENAI_API_KEY or SARVAM_API_KEY in .env"
    )
