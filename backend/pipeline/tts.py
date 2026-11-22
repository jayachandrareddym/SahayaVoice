"""
SahayaVoice – Text-to-Speech (TTS) pipeline module
Owner: Member 7 (TTS & Document Output)

Strategy:
  Primary  → Sarvam AI bulbul TTS  (best for Indian accents / Kannada)
  Fallback → edge-tts               (free, no API key, good Indian-English voices)

API contract (wired into FastAPI by main.py):
  POST /api/speak
  Body JSON:
    { "text": "<text>", "language": "<kn|hi|ta|te|en>", "voice_id": "<optional>" }
  Response:
    { "audio_base64": "...", "mime_type": "audio/mpeg" }
"""

from __future__ import annotations

import asyncio
import io
import os
from typing import Literal

import httpx

LanguageCode = Literal["kn", "hi", "ta", "te", "en"]

# ---------------------------------------------------------------------------
# Voice mappings
# ---------------------------------------------------------------------------

# Sarvam AI bulbul voice IDs per language
# See: https://docs.sarvam.ai/api-reference-docs/text-to-speech
SARVAM_VOICES: dict[str, str] = {
    "kn": "neel",      # Kannada male
    "hi": "amartya",   # Hindi male
    "ta": "aarav",     # Tamil (closest available)
    "te": "aarav",     # Telugu (closest available)
    "en": "meera",     # Indian-English female
}

# Edge-TTS voice IDs per language
# Full list: `edge-tts --list-voices`
EDGE_TTS_VOICES: dict[str, str] = {
    "kn": "kn-IN-GaganNeural",
    "hi": "hi-IN-MadhurNeural",
    "ta": "ta-IN-ValluvarNeural",
    "te": "te-IN-MohanNeural",
    "en": "en-IN-NeerjaNeural",
}

SARVAM_API_URL = "https://api.sarvam.ai/text-to-speech"


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

    Tries Sarvam AI first (best Indian-language quality).
    Falls back to edge-tts if Sarvam is unavailable or not configured.

    Args:
        text:      The text to synthesise.
        language:  BCP-47-style language code (kn, hi, ta, te, en).
        voice_id:  Optional provider-specific voice override.

    Returns:
        Raw MP3 audio bytes ready for browser playback.
    """
    sarvam_key = os.getenv("SARVAM_API_KEY", "")

    if sarvam_key:
        try:
            return _synthesise_sarvam(text, language, voice_id, sarvam_key)
        except Exception:
            pass  # fall through to edge-tts

    return _synthesise_edge_tts(text, language, voice_id)


# ---------------------------------------------------------------------------
# Sarvam AI implementation
# ---------------------------------------------------------------------------

def _synthesise_sarvam(
    text: str,
    language: LanguageCode,
    voice_id: str | None,
    api_key: str,
) -> bytes:
    """Call Sarvam AI bulbul TTS and return MP3 bytes."""
    voice = voice_id or SARVAM_VOICES.get(language, "meera")

    # Sarvam expects BCP-47 locale codes
    locale_map = {"kn": "kn-IN", "hi": "hi-IN", "ta": "ta-IN", "te": "te-IN", "en": "en-IN"}
    target_locale = locale_map.get(language, "en-IN")

    payload = {
        "inputs":          [text],
        "target_language_code": target_locale,
        "speaker":         voice,
        "pitch":           0,
        "pace":            1.0,
        "loudness":        1.5,
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "model":           "bulbul:v1",
    }

    with httpx.Client(timeout=15) as client:
        resp = client.post(
            SARVAM_API_URL,
            json=payload,
            headers={"API-Subscription-Key": api_key},
        )
        resp.raise_for_status()

    data = resp.json()
    # Sarvam returns base64-encoded WAV/MP3 in data["audios"][0]
    import base64
    audio_b64: str = data["audios"][0]
    return base64.b64decode(audio_b64)


# ---------------------------------------------------------------------------
# Edge-TTS fallback implementation
# ---------------------------------------------------------------------------

def _synthesise_edge_tts(
    text: str,
    language: LanguageCode,
    voice_id: str | None,
) -> bytes:
    """Use Microsoft Edge-TTS (edge-tts package) to synthesise speech."""
    import edge_tts  # type: ignore[import]

    voice = voice_id or EDGE_TTS_VOICES.get(language, "en-IN-NeerjaNeural")

    async def _run() -> bytes:
        communicate = edge_tts.Communicate(text, voice)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        return buf.getvalue()

    # Run the async edge-tts call in a fresh event loop (we are in a sync context)
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Inside an already-running loop (e.g. FastAPI async endpoint)
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, _run())
                return future.result(timeout=30)
        else:
            return loop.run_until_complete(_run())
    except RuntimeError:
        return asyncio.run(_run())
