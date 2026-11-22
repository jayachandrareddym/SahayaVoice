"""
SahayaVoice – FastAPI Backend (Fully Integrated)
Merged: main + task-3 (M3) + task-7 (M7) + M6 agent

Endpoints:
  GET  /health              – service liveness
  POST /api/transcribe      – audio → transcript   (M3 / M4)
  POST /api/process-voice   – transcript → Kannada letter (M6 agent)
  POST /api/speak           – text → TTS audio base64 (M7)
  POST /api/demo-preset     – one-click demo scenario (offline)
  POST /api/download-pdf    – Kannada letter → PDF download (M7)
"""

from __future__ import annotations

import base64
import io
import logging
import os
from typing import Literal, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SahayaVoice API",
    description="Multilingual, dialect-aware Voice AI civic assistant for Bengaluru.",
    version="0.3.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class ProcessVoiceRequest(BaseModel):
    transcript: str
    language:   str = "en"
    session_id: str = ""
    context:    Optional[list[dict]] = None  # type: ignore[type-arg]


class SpeakRequest(BaseModel):
    text:     str
    language: str = "en"
    voice_id: Optional[str] = None


class DemoPresetRequest(BaseModel):
    preset_id: Literal["bescom_whitefield", "bwssb_jayanagar", "rental_koramangala"]
    language:  str = "en"


class PdfRequest(BaseModel):
    kannada_letter: str
    summary:        str = ""
    language:       str = "en"


# ---------------------------------------------------------------------------
# Demo preset data (offline – no AI needed for hackathon demo)
# ---------------------------------------------------------------------------
_DEMO_PRESETS: dict[str, dict] = {  # type: ignore[type-arg]
    "bescom_whitefield": {
        "transcript": "Whitefield area lo last 3 days se power fluctuation ho raha hai. Mere ghar ke sare appliances damage ho gaye.",
        "language": "en",
        "action": "generate",
        "kannada_letter": (
            "ಮಾನ್ಯ ಆಯುಕ್ತರು,\n"
            "ಬೆಸ್ಕಾಮ್ ವಿದ್ಯುತ್ ಸರಬರಾಜು ಕಂಪನಿ,\nಬೆಂಗಳೂರು.\n\n"
            "ವಿಷಯ: ವೈಟ್‌ಫೀಲ್ಡ್ ಪ್ರದೇಶದಲ್ಲಿ ವಿದ್ಯುತ್ ವೋಲ್ಟೇಜ್ ಏರಿಳಿತ ಸಮಸ್ಯೆ ಬಗ್ಗೆ ದೂರು.\n\n"
            "ಮಾನ್ಯರೇ,\nಕಳೆದ 3 ದಿನಗಳಿಂದ ವೈಟ್‌ಫೀಲ್ಡ್ ಪ್ರದೇಶದಲ್ಲಿ ನಿರಂತರ ವಿದ್ಯುತ್ ವೋಲ್ಟೇಜ್ ಏರಿಳಿತ "
            "ಸಂಭವಿಸುತ್ತಿದೆ. ಮನೆಯ ವಿದ್ಯುತ್ ಉಪಕರಣಗಳು ಹಾನಿಗೊಳಗಾಗಿವೆ.\n\n"
            "ದಯವಿಟ್ಟು ಶೀಘ್ರ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ವಿನಂತಿಸುತ್ತೇನೆ.\n\n"
            "ವಂದನೆಗಳು,\nನಿವಾಸಿ, ವೈಟ್‌ಫೀಲ್ಡ್"
        ),
        "summary": "Complaint about power voltage fluctuation in Whitefield area for 3 days, causing damage to home appliances.",
        "next_steps": "Submit to BESCOM Whitefield division office or call 1912.",
    },
    "bwssb_jayanagar": {
        "transcript": "Jayanagar 4th block mein pichle do din se paani nahi aa raha. Humein bahut takleef ho rahi hai.",
        "language": "hi",
        "action": "generate",
        "kannada_letter": (
            "ಮಾನ್ಯ ಆಯುಕ್ತರು,\n"
            "ಬೆಂಗಳೂರು ನೀರು ಸರಬರಾಜು ಮತ್ತು ಒಳಚರಂಡಿ ಮಂಡಳಿ (BWSSB),\nಬೆಂಗಳೂರು.\n\n"
            "ವಿಷಯ: ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್‌ನಲ್ಲಿ ಕುಡಿಯುವ ನೀರು ಸರಬರಾಜು ಸ್ಥಗಿತ.\n\n"
            "ಮಾನ್ಯರೇ,\nಕಳೆದ 2 ದಿನಗಳಿಂದ ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್‌ನಲ್ಲಿ ನೀರು ಸರಬರಾಜು ಆಗುತ್ತಿಲ್ಲ. "
            "ನಿವಾಸಿಗಳಿಗೆ ತೀವ್ರ ತೊಂದರೆ ಉಂಟಾಗಿದೆ.\n\n"
            "ದಯವಿಟ್ಟು ಅಗತ್ಯ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ವಿನಂತಿ.\n\n"
            "ವಂದನೆಗಳು,\nನಿವಾಸಿ, ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್"
        ),
        "summary": "No water supply in Jayanagar 4th Block for 2 days causing severe hardship to residents.",
        "next_steps": "Submit to BWSSB Jayanagar division or call 1916.",
    },
    "rental_koramangala": {
        "transcript": "My landlord in Koramangala is refusing to return my security deposit of 50,000 rupees even after 3 months of vacating.",
        "language": "en",
        "action": "generate",
        "kannada_letter": (
            "ಮಾನ್ಯ ನ್ಯಾಯಾಧಿಕಾರಿಗಳಿಗೆ,\nಬಾಡಿಗೆ ನ್ಯಾಯಾಲಯ,\nಬೆಂಗಳೂರು.\n\n"
            "ವಿಷಯ: ಭದ್ರತಾ ಠೇವಣಿ ವಾಪಸ್ ನೀಡದ ಬಗ್ಗೆ ದೂರು – ಕೋರಮಂಗಲ.\n\n"
            "ಮಾನ್ಯರೇ,\nನಾನು 3 ತಿಂಗಳ ಹಿಂದೆ ಕೋರಮಂಗಲ ಬಾಡಿಗೆ ಮನೆ ಖಾಲಿ ಮಾಡಿದ್ದೇನೆ. "
            "ಮನೆ ಮಾಲೀಕರು ₹50,000 ಭದ್ರತಾ ಠೇವಣಿ ವಾಪಸ್ ನೀಡಲು ನಿರಾಕರಿಸುತ್ತಿದ್ದಾರೆ.\n\n"
            "ಕರ್ನಾಟಕ ಬಾಡಿಗೆ ನಿಯಂತ್ರಣ ಕಾಯ್ದೆ 2001ರ ಅಡಿಯಲ್ಲಿ ಸೂಕ್ತ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ವಿನಂತಿ.\n\n"
            "ವಂದನೆಗಳು,\nಅರ್ಜಿದಾರರು"
        ),
        "summary": "Landlord in Koramangala refusing to refund ₹50,000 security deposit 3 months after tenant vacated.",
        "next_steps": "File complaint at Bangalore Rent Court or consult Karnataka Rent Control Act 2001.",
    },
}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["meta"])
async def health_check():
    return {"status": "ok", "service": "sahayavoice-api", "version": "0.3.0"}


# ---------------------------------------------------------------------------
# M3 – POST /api/transcribe
# ---------------------------------------------------------------------------
@app.post("/api/transcribe", tags=["stt"])
async def transcribe_audio(
    file:     UploadFile = File(...),
    language: str        = Form("en"),
):
    try:
        from pipeline.stt import transcribe  # type: ignore[import]
        audio_bytes = await file.read()
        transcript  = await transcribe(audio_bytes, language)
    except (ImportError, NotImplementedError):
        transcript = f"[STT pending – M4] language={language}"

    return {"transcript": transcript, "language": language}


# ---------------------------------------------------------------------------
# M6 – POST /api/process-voice
# ---------------------------------------------------------------------------
@app.post("/api/process-voice", tags=["llm"])
async def process_voice(req: ProcessVoiceRequest):
    try:
        from pipeline.sahaya.agent import process_full_text  # type: ignore[import]
        result = await process_full_text(req.transcript)

        if result.status == "complete" and result.complaint_letter:
            return {
                "transcript":     req.transcript,
                "language":       req.language,
                "action":         "generate",
                "kannada_letter": result.complaint_letter.kannada_letter,
                "summary":        result.complaint_letter.english_summary,
                "next_steps":     "Submit to BBMP/BESCOM/BWSSB ward office or upload to official portal.",
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
            raise HTTPException(status_code=500, detail=result.error or "Agent error")

    except (ImportError, NotImplementedError):
        # Stub so UI works without API keys
        return {
            "transcript":     req.transcript,
            "language":       req.language,
            "action":         "generate",
            "kannada_letter": (
                "ಮಾನ್ಯ ಆಯುಕ್ತರು,\n\n"
                "ನಾನು ____________ ನಿವಾಸಿ. ನಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ________________ ಸಮಸ್ಯೆ ಇದೆ.\n"
                "ದಯವಿಟ್ಟು ಶೀಘ್ರ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಿ.\n\nವಂದನೆಗಳು,\n____________"
            ),
            "summary":    f"Complaint received: {req.transcript[:120]}",
            "next_steps": "Add WATSONX_API_KEY to backend/.env to enable full AI generation.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Agent error: {exc}") from exc


# ---------------------------------------------------------------------------
# M7 – POST /api/speak  (TTS)
# ---------------------------------------------------------------------------
@app.post("/api/speak", tags=["tts"])
async def speak(req: SpeakRequest):
    try:
        from pipeline.tts import synthesise_speech  # type: ignore[import]
        audio_bytes = synthesise_speech(req.text, req.language, req.voice_id)  # type: ignore[arg-type]
        return {"audio_base64": base64.b64encode(audio_bytes).decode(), "mime_type": "audio/mpeg"}
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS error: {exc}") from exc


# ---------------------------------------------------------------------------
# Demo preset – POST /api/demo-preset
# Returns a pre-built VoiceResult; works offline (no AI key needed)
# ---------------------------------------------------------------------------
@app.post("/api/demo-preset", tags=["demo"])
async def demo_preset(req: DemoPresetRequest):
    preset = _DEMO_PRESETS.get(req.preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Unknown preset: {req.preset_id}")
    return {**preset, "language": req.language}


# ---------------------------------------------------------------------------
# M7 – POST /api/download-pdf
# ---------------------------------------------------------------------------
@app.post("/api/download-pdf", tags=["pdf"])
async def download_pdf(req: PdfRequest):
    try:
        from pipeline.pdf import generate_pdf  # type: ignore[import]
        pdf_bytes = generate_pdf(req.kannada_letter, req.summary)
    except (ImportError, NotImplementedError):
        raise HTTPException(status_code=501, detail="PDF generation not yet available")
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
