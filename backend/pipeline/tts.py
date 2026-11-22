"""
SahayaVoice – Text-to-Speech (TTS) pipeline module
Owner: Member 7 (TTS & Document Output)

- Primary:  Sarvam AI bulbul TTS (best Indian accent quality)
- Fallback: Microsoft Edge-TTS (free, no API key needed)
- Accepts text in kn / hi / ta / te / en
- Returns MP3 audio bytes ready for browser playback
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
from typing import Literal

import httpx

logger = logging.getLogger(__name__)

LanguageCode = Literal["kn", "hi", "ta", "te", "en"]

# ---------------------------------------------------------------------------
# Voice selection maps
# ---------------------------------------------------------------------------

# Sarvam AI bulbul voice IDs per language
_SARVAM_VOICE_MAP: dict[str, str] = {
    "kn": "neel",       # Kannada male
    "hi": "meera",      # Hindi female
    "ta": "arjun",      # Tamil male
    "te": "pavithra",   # Telugu female
    "en": "arvind",     # Indian English male
}

# Edge-TTS voice names per language (fallback)
_EDGE_VOICE_MAP: dict[str, str] = {
    "kn": "kn-IN-GaganNeural",
    "hi": "hi-IN-SwaraNeural",
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-ShrutiNeural",
    "en": "en-IN-NeerjaNeural",
}


# ---------------------------------------------------------------------------
# Sarvam AI bulbul TTS
# ---------------------------------------------------------------------------

def _synthesise_sarvam(text: str, language: LanguageCode, voice_id: str | None) -> bytes:
    """Call Sarvam AI bulbul to generate speech."""
    api_key = os.environ["SARVAM_API_KEY"]
    voice = voice_id or _SARVAM_VOICE_MAP.get(language, "meera")
    lang_code = f"{language}-IN"

    with httpx.Client(timeout=30) as client:
        response = client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={"api-subscription-key": api_key, "Content-Type": "application/json"},
            json={
                "inputs": [text],
                "target_language_code": lang_code,
                "speaker": voice,
                "pitch": 0,
                "pace": 1.0,
                "loudness": 1.5,
                "speech_sample_rate": 22050,
                "enable_preprocessing": True,
                "model": "bulbul:v1",
            },
        )
        response.raise_for_status()
        data = response.json()

    # Sarvam returns base64-encoded audio in audios[0]
    import base64
    audio_b64 = data["audios"][0]
    return base64.b64decode(audio_b64)


# ---------------------------------------------------------------------------
# Edge-TTS fallback
# ---------------------------------------------------------------------------

def _synthesise_edge(text: str, language: LanguageCode, voice_id: str | None) -> bytes:
    """Use Microsoft Edge-TTS (edge-tts package) as a no-key fallback."""
    import edge_tts  # type: ignore

    voice = voice_id or _EDGE_VOICE_MAP.get(language, "en-IN-NeerjaNeural")

    async def _run() -> bytes:
        communicate = edge_tts.Communicate(text, voice)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        return buf.getvalue()

    return asyncio.run(_run())


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def synthesise_speech(
    text: str,
    language: LanguageCode,
    voice_id: str | None = None,
) -> bytes:
    """
    Convert text to spoken audio (MP3 bytes).

    Tries Sarvam AI bulbul first (requires SARVAM_API_KEY).
    Falls back to Edge-TTS automatically if the key is absent or the call fails.

    Args:
        text:      The text to synthesise.
        language:  Target language code for voice selection.
        voice_id:  Optional provider-specific voice ID override.

    Returns:
        Raw MP3 audio bytes.
    """
    if os.environ.get("SARVAM_API_KEY"):
        try:
            logger.info("TTS: using Sarvam AI bulbul")
            return _synthesise_sarvam(text, language, voice_id)
        except Exception as exc:
            logger.warning("Sarvam TTS failed (%s), falling back to Edge-TTS", exc)

    logger.info("TTS: using Edge-TTS (fallback)")
    return _synthesise_edge(text, language, voice_id)
