"""
TTS service – converts text to speech.

Primary:  Sarvam AI (Indian language voices)
Fallback: gTTS (Google Text-to-Speech, no API key required)

Returns a base-64-encoded MP3/WAV string ready for the browser's
<audio src="data:audio/mp3;base64,…"> element.
"""

import asyncio
import base64
import io
import os
from typing import Optional

import httpx

SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")

# Sarvam AI voice names per language
_SARVAM_VOICES: dict[str, str] = {
    "kn": "anushka",
    "hi": "meera",
    "ta": "pavithra",
    "te": "maitreyi",
    "en": "arya",
}

# BCP-47 locale for Sarvam
_SARVAM_LOCALE: dict[str, str] = {
    "kn": "kn-IN",
    "hi": "hi-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "en": "en-IN",
}

# gTTS language codes (Kannada not natively supported → fall back to English voice)
_GTTS_LANG: dict[str, str] = {
    "kn": "en",   # gTTS has no Kannada; use English voice for Kanglish fallback
    "hi": "hi",
    "ta": "ta",
    "te": "te",
    "en": "en",
}


async def synthesize_speech(text: str, lang_code: str) -> str:
    """
    Return a base-64-encoded audio string for *text* in *lang_code*.

    Attempts Sarvam AI first; falls back to gTTS when no API key is set
    or when Sarvam returns an error.
    """
    # Truncate to avoid exceeding TTS limits
    text = text[:500].strip()
    if not text:
        return ""

    if SARVAM_API_KEY:
        try:
            return await _sarvam_tts(text, lang_code)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                "Sarvam TTS failed (%s); falling back to gTTS.", exc
            )

    return await _gtts_fallback(text, lang_code)


# ---------------------------------------------------------------------------
# Sarvam AI
# ---------------------------------------------------------------------------

async def _sarvam_tts(text: str, lang_code: str) -> str:
    locale = _SARVAM_LOCALE.get(lang_code, "en-IN")
    voice = _SARVAM_VOICES.get(lang_code, "arya")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={"api-subscription-key": SARVAM_API_KEY},
            json={
                "inputs": [text],
                "target_language_code": locale,
                "speaker": voice,
                "model": "bulbul:v1",
                "enable_preprocessing": True,
            },
        )
        resp.raise_for_status()
        # Sarvam returns base-64 audio directly
        return resp.json()["audios"][0]


# ---------------------------------------------------------------------------
# gTTS fallback
# ---------------------------------------------------------------------------

async def _gtts_fallback(text: str, lang_code: str) -> str:
    """Run gTTS in a thread executor to avoid blocking the event loop."""

    def _generate() -> str:
        from gtts import gTTS  # lazy import – optional dependency
        buf = io.BytesIO()
        tts = gTTS(text=text, lang=_GTTS_LANG.get(lang_code, "en"))
        tts.write_to_fp(buf)
        return base64.b64encode(buf.getvalue()).decode()

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _generate)
