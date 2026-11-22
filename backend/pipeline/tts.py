"""
SahayaVoice – Text-to-Speech (TTS) pipeline module
Owner: Member 7 (TTS & Document Output)
Scaffold by: Member 1 (Task 1)

Responsibilities:
  - Accept text in any supported language (kn, hi, ta, te, en)
  - Synthesise speech using Sarvam AI (bulbul), Edge-TTS, or ElevenLabs
  - Return audio bytes ready for browser playback (MP3 / WAV)

API contract (for M5 to wire into FastAPI router):
  POST /api/speak
  Body JSON:
  {
    "text":     "<text to synthesise>",
    "language": "<kn|hi|ta|te|en>",
    "voice_id": "<optional provider voice ID>"
  }
  Response: audio/mpeg binary stream
  (or JSON { "audio_base64": "..." } for simpler frontend integration)
"""

from __future__ import annotations

from typing import Literal

LanguageCode = Literal["kn", "hi", "ta", "te", "en"]


def synthesise_speech(
    text: str,
    language: LanguageCode,
    voice_id: str | None = None,
) -> bytes:
    """
    Convert text to spoken audio.

    Args:
        text:      The text to synthesise.
        language:  Target language for voice selection.
        voice_id:  Optional provider-specific voice ID override.

    Returns:
        Raw MP3 (or WAV) audio bytes.

    TODO (M7):
      1. Integrate Sarvam AI bulbul TTS endpoint (preferred for Indian accents).
      2. Fallback to Edge-TTS or ElevenLabs if Sarvam is unavailable.
      3. Select appropriate voice per language when voice_id is not provided.
      4. Cache common short responses (e.g. confirmation phrases) to reduce latency.
    """
    raise NotImplementedError(
        "M7 – please implement synthesise_speech() in backend/pipeline/tts.py"
    )
