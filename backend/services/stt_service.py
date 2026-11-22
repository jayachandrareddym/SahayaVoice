"""
Service adapter: wraps Member 4's MultilingualTranscriber for async use.
Runs CPU-bound Whisper inference in a thread-pool executor so it never
blocks FastAPI's async event loop.
"""

import asyncio
from functools import lru_cache
from typing import Optional

from backend.pipeline.stt import MultilingualTranscriber


@lru_cache(maxsize=1)
def _transcriber() -> MultilingualTranscriber:
    """Singleton — Whisper model is loaded once and reused across requests."""
    return MultilingualTranscriber(whisper_model="medium")


async def transcribe_audio(audio_bytes: bytes, hint_language: Optional[str]) -> dict:
    """Async wrapper around MultilingualTranscriber.transcribe()."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        _transcriber().transcribe,
        audio_bytes,
        hint_language,
    )
