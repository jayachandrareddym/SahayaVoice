"""
POST /api/process-voice
Full audio-upload pipeline: audio → STT → LLM → TTS.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from backend.services.stt_service import transcribe_audio
from backend.services.llm_service import generate_response
from backend.services.tts_service import synthesize_speech
from backend.session import SessionStore

router = APIRouter()
_sessions = SessionStore()

_ALLOWED_MIME = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/ogg",
    "audio/webm",
    "application/octet-stream",
}
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/process-voice", summary="Speech → Transcript → AI Response → Audio")
async def process_voice(
    audio: UploadFile = File(..., description="Audio file: wav / mp3 / ogg / webm"),
    session_id: Optional[str] = Form(None, description="Existing session ID; omit to create a new one"),
    hint_language: Optional[str] = Form(
        None,
        description="Optional ISO-639-1 hint: kn | hi | ta | te | en",
    ),
) -> JSONResponse:
    """
    Full SahayaVoice pipeline in one request:

    1. Receive audio upload.
    2. Denoise + transcribe (Member 4 STT module).
    3. Detect language if no hint is provided.
    4. Send transcript to LLM agent (Member 6).
    5. Convert LLM response to speech (Member 7 TTS).
    6. Return JSON with transcript, response text and base-64 audio.
    """
    if audio.content_type not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{audio.content_type}'. "
            f"Accepted: {sorted(_ALLOWED_MIME)}",
        )

    audio_bytes = await audio.read()
    if len(audio_bytes) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="Audio exceeds 10 MB limit.")
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    session_id = session_id or str(uuid.uuid4())
    history = _sessions.get(session_id)

    # ── Step 1: STT ──────────────────────────────────────────────────
    stt_result = await transcribe_audio(audio_bytes, hint_language)
    transcript: str = stt_result["transcript"]
    lang_code: str = stt_result["language_code"]

    if not transcript.strip():
        raise HTTPException(
            status_code=422,
            detail="No speech detected in the uploaded audio.",
        )

    # ── Step 2: LLM ──────────────────────────────────────────────────
    llm_text = await generate_response(transcript, history, lang_code)

    # ── Step 3: TTS ──────────────────────────────────────────────────
    tts_b64 = await synthesize_speech(llm_text, lang_code)

    # ── Persist turn ─────────────────────────────────────────────────
    _sessions.append(session_id, user=transcript, assistant=llm_text)

    return JSONResponse(
        {
            "session_id": session_id,
            "stt": stt_result,
            "response": {
                "text": llm_text,
                "language_code": lang_code,
                "audio_base64": tts_b64,
            },
        }
    )
