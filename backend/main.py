"""
SahayaVoice – FastAPI Backend Entry Point
Member 1 (Task 1): Architecture scaffold and integration wiring.

Endpoints:
  GET  /health              – service health check
  POST /api/transcribe      – audio → transcript  (M3 uploads, M4/M5 STT logic)
  POST /api/process-voice   – transcript → SahayaResult (M6 AI agent)
  POST /api/speak           – text → TTS audio base64  (M7)
  POST /api/download-pdf    – Kannada letter → PDF download  (M7)
"""

from __future__ import annotations

import base64
import io
import logging

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="SahayaVoice API",
    description="Multilingual, dialect-aware Voice AI civic assistant for Bengaluru.",
    version="0.2.0",
)

# ---------------------------------------------------------------------------
# CORS – allow the Next.js dev server (and production domain) to call the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # Next.js dev server
        "https://sahayavoice.app",  # production (update when known)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["meta"])
async def health_check():
    """Returns 200 OK with service status."""
    return {"status": "ok", "service": "sahayavoice-api", "version": "0.2.0"}


# ---------------------------------------------------------------------------
# M3 – POST /api/transcribe
# Accepts audio file + language hint, returns transcript text.
# Real STT logic owned by M4; this stub keeps M3 frontend working.
# ---------------------------------------------------------------------------
@app.post("/api/transcribe", tags=["stt"])
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file (webm/ogg/wav/mp3)"),
    language: str    = Form("en", description="BCP-47 language hint: kn, hi, ta, te, en"),
):
    """
    Receive a recorded audio blob from the browser (VoiceRecorder → M3),
    run speech-to-text (M4 owns the actual STT implementation),
    and return the plain-text transcript.
    """
    try:
        from pipeline.stt import transcribe  # type: ignore[import]
        audio_bytes = await file.read()
        transcript  = await transcribe(audio_bytes, language)
    except (ImportError, NotImplementedError):
        # Stub – keeps frontend working while M4 builds real STT
        transcript = f"[STT not yet implemented – M4 pending] language={language}"

    return {"transcript": transcript, "language": language}


# ---------------------------------------------------------------------------
# M6 – POST /api/process-voice
# Accepts transcript + language, runs the SahayaVoice AI agent,
# returns a VoiceResult-compatible JSON for the frontend.
# ---------------------------------------------------------------------------
class ProcessVoiceRequest(BaseModel):
    transcript: str
    language:   str = "en"


@app.post("/api/process-voice", tags=["llm"])
async def process_voice(req: ProcessVoiceRequest):
    """
    Run the SahayaVoice AI agent (M6) on the transcript and return
    a structured VoiceResult for the frontend to render.

    Response shape matches the VoiceResult interface in page.tsx:
      { transcript, language, action, kannada_letter,
        summary, next_steps, clarify_question? }
    """
    try:
        from pipeline.sahaya.agent import process_full_text  # type: ignore[import]
        result = await process_full_text(req.transcript)

        # Map SahayaResult → VoiceResult (frontend interface)
        if result.status == "complete" and result.complaint_letter:
            return {
                "transcript":      req.transcript,
                "language":        req.language,
                "action":          "generate",
                "kannada_letter":  result.complaint_letter.kannada_letter,
                "summary":         result.complaint_letter.english_summary,
                "next_steps":      (
                    "Submit this letter to the BBMP/BESCOM/BWSSB ward office, "
                    "or upload it to the official portal."
                ),
            }
        elif result.status == "needs_clarification":
            return {
                "transcript":       req.transcript,
                "language":         req.language,
                "action":           "clarify",
                "kannada_letter":   "",
                "summary":          "",
                "next_steps":       "",
                "clarify_question": result.clarification_question or "",
            }
        else:
            # Failed or unknown — return a graceful error result
            raise HTTPException(
                status_code=500,
                detail=result.error or "AI agent returned an unexpected status.",
            )

    except (ImportError, NotImplementedError):
        # M6 not yet wired — return a demo stub so the UI still works
        return {
            "transcript":     req.transcript,
            "language":       req.language,
            "action":         "generate",
            "kannada_letter": (
                "ಮಾನ್ಯ ಆಯುಕ್ತರು,\n\n"
                "ನಾನು ____________ ನಿವಾಸಿ. ನಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ________________ ಸಮಸ್ಯೆ ಇದೆ.\n"
                "ದಯವಿಟ್ಟು ಶೀಘ್ರ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಿ.\n\n"
                "ವಂದನೆಗಳು,\n____________"
            ),
            "summary":    f"Complaint received: {req.transcript[:100]}...",
            "next_steps": "Submit to BBMP ward office (M6 AI module pending).",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Agent error: {exc}") from exc


# ---------------------------------------------------------------------------
# M7 – POST /api/speak  (TTS)
# ---------------------------------------------------------------------------
class SpeakRequest(BaseModel):
    text:     str
    language: str      = "en"
    voice_id: str | None = None


@app.post("/api/speak", tags=["tts"])
async def speak(req: SpeakRequest):
    """Convert text to speech and return base64-encoded MP3 audio."""
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
# M7 – POST /api/download-pdf  (PDF generation)
# ---------------------------------------------------------------------------
class PdfRequest(BaseModel):
    kannada_letter: str
    summary:        str = ""
    language:       str = "en"


@app.post("/api/download-pdf", tags=["pdf"])
async def download_pdf(req: PdfRequest):
    """Generate and stream a PDF of the official Kannada complaint letter."""
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
