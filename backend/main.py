"""
SahayaVoice – FastAPI Backend Entry Point
Member 1 (Task 1): Architecture scaffold and integration wiring.
Actual endpoint logic lives in the pipeline modules owned by M4–M7.

Member 3 adds:  POST /api/transcribe  (audio upload stub – real logic owned by M4/M5)
Member 7 adds:  POST /api/speak       (TTS audio synthesis)
                POST /api/download-pdf (PDF generation)
"""

from __future__ import annotations

import base64
import io

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(
    title="SahayaVoice API",
    description="Multilingual, dialect-aware Voice AI civic assistant for Bengaluru.",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS – allow the Next.js dev server (and production domain) to call the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js dev server
        "https://sahayavoice.app", # production (update when known)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check – used by the team lead / CI to verify the service is up
# ---------------------------------------------------------------------------
@app.get("/health", tags=["meta"])
async def health_check():
    """Returns 200 OK with service status. No auth required."""
    return {"status": "ok", "service": "sahayavoice-api", "version": "0.1.0"}


# ---------------------------------------------------------------------------
# Routers – each pipeline module registers its own routes.
# M5 (Backend & API Developer) owns the actual router implementations;
# M1 wires them here so the app stays modular.
# ---------------------------------------------------------------------------
# Uncomment and import once each member's router is implemented:
#
# from pipeline.stt import router as stt_router       # M4
# from pipeline.llm_agent import router as llm_router # M6
#
# app.include_router(stt_router,  prefix="/api", tags=["stt"])
# app.include_router(llm_router,  prefix="/api", tags=["llm"])


# ---------------------------------------------------------------------------
# M3 – /api/transcribe
# Accepts an audio file upload + language hint.
# Stub returns a placeholder until M4/M5 wires in Whisper/Sarvam.
# ---------------------------------------------------------------------------
@app.post("/api/transcribe", tags=["stt"])
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file (webm/ogg/wav/mp3)"),
    language: str    = Form("en", description="BCP-47 language hint: kn, hi, ta, te, en"),
):
    """
    Receive a recorded audio blob from the browser (M3 → VoiceRecorder),
    run speech-to-text (M4 owns the actual STT logic),
    and return the plain-text transcript.
    """
    try:
        from pipeline.stt import transcribe  # type: ignore[import]
        audio_bytes = await file.read()
        transcript  = await transcribe(audio_bytes, language)
    except (ImportError, NotImplementedError):
        # Stub – keeps M3 frontend working while M4 builds the real implementation
        transcript = f"[STT not yet implemented – M4 pending] language={language}"

    return {"transcript": transcript, "language": language}


# ---------------------------------------------------------------------------
# M7 – /api/speak  (TTS)
# ---------------------------------------------------------------------------
class SpeakRequest(BaseModel):
    text:     str
    language: str = "en"
    voice_id: str | None = None


@app.post("/api/speak", tags=["tts"])
async def speak(req: SpeakRequest):
    """
    Convert text to speech and return audio as base64-encoded MP3.
    Owner: Member 7 (TTS & Document Output).
    """
    try:
        from pipeline.tts import synthesise_speech  # type: ignore[import]
        audio_bytes = synthesise_speech(req.text, req.language, req.voice_id)  # type: ignore[arg-type]
        audio_b64   = base64.b64encode(audio_bytes).decode()
        return {"audio_base64": audio_b64, "mime_type": "audio/mpeg"}
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS error: {exc}") from exc


# ---------------------------------------------------------------------------
# M7 – /api/download-pdf  (PDF generation)
# ---------------------------------------------------------------------------
class PdfRequest(BaseModel):
    kannada_letter: str
    summary:        str = ""
    language:       str = "en"


@app.post("/api/download-pdf", tags=["pdf"])
async def download_pdf(req: PdfRequest):
    """
    Generate a downloadable PDF of the Kannada complaint letter.
    Owner: Member 7 (TTS & Document Output).
    """
    try:
        from pipeline.pdf import generate_pdf  # type: ignore[import]
        pdf_bytes = generate_pdf(req.kannada_letter, req.summary)
    except (ImportError, NotImplementedError):
        raise HTTPException(status_code=501, detail="PDF generation not yet implemented (M7)")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF error: {exc}") from exc

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="sahayavoice_complaint.pdf"'},
    )


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
