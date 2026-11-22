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
# M5 – /api/process-voice  (Transcript → Kannada letter via M6 agent)
# ---------------------------------------------------------------------------
class ProcessVoiceRequest(BaseModel):
    transcript: str
    language:   str = "en"


@app.post("/api/process-voice", tags=["agent"])
async def process_voice(req: ProcessVoiceRequest):
    """
    Accept a plain-text transcript (from M3/M4), run it through the
    SahayaVoice civic complaint agent (M6), and return a VoiceResult JSON.
    Owner: Member 5 (Backend & API Developer) + Member 6 (AI Agent).
    """
    try:
        from pipeline.sahaya.agent import process_full_text  # type: ignore[import]
        result = await process_full_text(req.transcript)
        if result.status == "failed":
            raise HTTPException(status_code=500, detail=result.error or "Agent failed")
        letter = result.complaint_letter
        return {
            "transcript":        req.transcript,
            "language":          req.language,
            "kannada_letter":    letter.kannada_letter if letter else "",
            "summary":           letter.english_summary if letter else "",
            "next_steps":        "Print and submit to your ward office or upload to the BBMP portal.",
            "action":            "generate",
            "clarify_question":  result.clarification_question,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Agent error: {exc}") from exc


# ---------------------------------------------------------------------------
# M5/M8 – /api/demo-preset  (One-click demo scenarios for judging)
# ---------------------------------------------------------------------------
class DemoPresetRequest(BaseModel):
    preset_id: str
    language:  str = "en"


# M8 owns the content of these presets – improve Kannada letters before demo day
_DEMO_PRESETS: dict[str, dict] = {
    "bescom_whitefield": {
        "transcript": "There is severe power fluctuation in my area for the past 3 days in Whitefield.",
        "kannada_letter": (
            "ಮಾನ್ಯ ಅಧಿಕಾರಿಗಳಿಗೆ,\n\n"
            "ವಿಷಯ: ವೈಟ್‌ಫೀಲ್ಡ್ ಪ್ರದೇಶದಲ್ಲಿ ವಿದ್ಯುತ್ ಏರಿಳಿತದ ದೂರು\n\n"
            "ನಾನು ವೈಟ್‌ಫೀಲ್ಡ್ ನಿವಾಸಿಯಾಗಿದ್ದು, ಕಳೆದ 3 ದಿನಗಳಿಂದ ನಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ "
            "ನಿರಂತರ ವಿದ್ಯುತ್ ಏರಿಳಿತ ಉಂಟಾಗುತ್ತಿದೆ. ಇದರಿಂದ ಮನೆಯ ವಿದ್ಯುತ್ ಉಪಕರಣಗಳು "
            "ಹಾಳಾಗುವ ಭಯವಿದೆ. ದಯಮಾಡಿ ತಕ್ಷಣ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ವಿನಂತಿಸುತ್ತೇನೆ.\n\n"
            "ವಂದನೆಗಳೊಂದಿಗೆ,\nನಿಮ್ಮ ವಿಧೇಯ"
        ),
        "summary": "BESCOM complaint: Power fluctuation in Whitefield area for 3 days. Requesting immediate action.",
        "next_steps": "Call BESCOM helpline 1912 or visit the nearest BESCOM office in Whitefield.",
        "action": "generate",
    },
    "bwssb_jayanagar": {
        "transcript": "No water supply in Jayanagar 4th block for the past 2 days.",
        "kannada_letter": (
            "ಮಾನ್ಯ ಅಧಿಕಾರಿಗಳಿಗೆ,\n\n"
            "ವಿಷಯ: ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್‌ನಲ್ಲಿ ನೀರು ಸರಬರಾಜು ಸ್ಥಗಿತ\n\n"
            "ನಾನು ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್ ನಿವಾಸಿಯಾಗಿದ್ದು, ಕಳೆದ 2 ದಿನಗಳಿಂದ ನಮ್ಮ ಪ್ರದೇಶಕ್ಕೆ "
            "ಯಾವುದೇ ನೀರಿನ ಸರಬರಾಜು ಆಗುತ್ತಿಲ್ಲ. ದಿನನಿತ್ಯದ ಕಾರ್ಯಗಳಿಗೆ ತೊಂದರೆ ಆಗುತ್ತಿದೆ. "
            "ದಯಮಾಡಿ ಶೀಘ್ರ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ವಿನಂತಿಸುತ್ತೇನೆ.\n\n"
            "ವಂದನೆಗಳೊಂದಿಗೆ,\nನಿಮ್ಮ ವಿಧೇಯ"
        ),
        "summary": "BWSSB complaint: No water supply in Jayanagar 4th block for 2 days.",
        "next_steps": "Call BWSSB helpline 1916 or visit the nearest BWSSB office.",
        "action": "generate",
    },
    "rental_koramangala": {
        "transcript": "My landlord is not returning my security deposit in Koramangala. It has been 3 months.",
        "kannada_letter": (
            "ಮಾನ್ಯ ಅಧಿಕಾರಿಗಳಿಗೆ,\n\n"
            "ವಿಷಯ: ಭದ್ರತಾ ಠೇವಣಿ ವಾಪಸ್ ನೀಡದಿರುವ ಬಗ್ಗೆ ದೂರು – ಕೋರಮಂಗಲ\n\n"
            "ನಾನು ಕೋರಮಂಗಲದಲ್ಲಿ ಬಾಡಿಗೆ ಮನೆಯಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದು, 3 ತಿಂಗಳ ಹಿಂದೆ ಮನೆ "
            "ಖಾಲಿ ಮಾಡಿದ್ದೇನೆ. ಆದರೂ ನನ್ನ ಮನೆ ಮಾಲೀಕರು ಭದ್ರತಾ ಠೇವಣಿ ಹಣವನ್ನು ವಾಪಸ್ "
            "ನೀಡುತ್ತಿಲ್ಲ. ದಯಮಾಡಿ ಸೂಕ್ತ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ವಿನಂತಿಸುತ್ತೇನೆ.\n\n"
            "ವಂದನೆಗಳೊಂದಿಗೆ,\nನಿಮ್ಮ ವಿಧೇಯ"
        ),
        "summary": "Rental dispute: Landlord not returning security deposit in Koramangala after 3 months.",
        "next_steps": "File complaint at Lok Adalat, civil court, or Rent Authority of Karnataka.",
        "action": "generate",
    },
}


@app.post("/api/demo-preset", tags=["demo"])
async def demo_preset(req: DemoPresetRequest):
    """
    Return a pre-filled VoiceResult for one-click demo scenarios during judging.
    Owner: Member 8 (QA & Demo) owns the preset content.
    """
    preset = _DEMO_PRESETS.get(req.preset_id)
    if not preset:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown preset_id: {req.preset_id!r}. Valid: {list(_DEMO_PRESETS.keys())}",
        )
    return {**preset, "language": req.language}


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
