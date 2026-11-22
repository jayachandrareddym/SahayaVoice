"""
SahayaVoice – FastAPI Backend
Member 1 (scaffold) + Member 5 (routes & orchestration)

Routes:
  GET  /health              – service health check
  POST /api/transcribe      – audio → transcript + language (STT)
  POST /api/process-voice   – transcript → Kannada letter / clarification (LLM)
  POST /api/speak           – text → audio stream (TTS)
  POST /api/demo-preset     – preset ID → pre-filled VoiceResult
  POST /api/download-pdf    – Kannada letter text → PDF download
"""

from __future__ import annotations

import io
import logging
import os
import uuid
from typing import Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SahayaVoice API",
    description="Multilingual, dialect-aware Voice AI civic assistant for Bengaluru.",
    version="0.1.0",
)

_allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
_allowed_origins += ["https://sahayavoice.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pipeline imports (lazy – so the app starts even without keys configured)
# ---------------------------------------------------------------------------
from pipeline.stt import transcribe_audio          # noqa: E402
from pipeline.llm_agent import process_voice_input  # noqa: E402
from pipeline.tts import synthesise_speech          # noqa: E402


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ProcessVoiceRequest(BaseModel):
    transcript: str
    language: str
    session_id: str = ""
    context: Optional[list[dict]] = None


class SpeakRequest(BaseModel):
    text: str
    language: str
    voice_id: Optional[str] = None


class DemoPresetRequest(BaseModel):
    preset_id: Literal[
        "bescom_whitefield",
        "bwssb_jayanagar",
        "rental_koramangala",
    ]
    language: str = "en"


class DownloadPdfRequest(BaseModel):
    kannada_letter: str
    summary: str = ""


# ---------------------------------------------------------------------------
# Pre-built demo preset payloads (reliable for hackathon judging, no LLM call)
# ---------------------------------------------------------------------------
_DEMO_PRESETS: dict[str, dict] = {
    "bescom_whitefield": {
        "action": "generate",
        "intent": "BESCOM",
        "transcript": "There is severe power fluctuation in my house in Whitefield. It has damaged my appliances.",
        "language": "en",
        "kannada_letter": (
            "ಸೇವೆಗೆ,\n"
            "ಬೆಸ್ಕಾಮ್ ಅಧಿಕಾರಿಗಳಿಗೆ,\n"
            "ವೈಟ್‌ಫೀಲ್ಡ್ ವಿಭಾಗ, ಬೆಂಗಳೂರು.\n\n"
            "ವಿಷಯ: ವಿದ್ಯುತ್ ಏರಿಳಿತದ ದೂರು – ವೈಟ್‌ಫೀಲ್ಡ್\n\n"
            "ಮಾನ್ಯರೇ,\n\n"
            "ನಾನು ವೈಟ್‌ಫೀಲ್ಡ್ ನಿವಾಸಿಯಾಗಿದ್ದು, ಕಳೆದ ಕೆಲವು ದಿನಗಳಿಂದ ನಮ್ಮ ಮನೆಯಲ್ಲಿ ತೀವ್ರ "
            "ವಿದ್ಯುತ್ ಏರಿಳಿತ ಉಂಟಾಗುತ್ತಿದೆ. ಇದರಿಂದ ನಮ್ಮ ವಿದ್ಯುತ್ ಉಪಕರಣಗಳಿಗೆ ಹಾನಿಯಾಗಿದೆ.\n\n"
            "ದಯವಿಟ್ಟು ತಕ್ಷಣ ಪರಿಹಾರ ಕಲ್ಪಿಸಬೇಕೆಂದು ವಿನಂತಿಸುತ್ತೇನೆ.\n\n"
            "ವಿಧೇಯವಾಗಿ,\n"
            "ಅರ್ಜಿದಾರರು"
        ),
        "summary": (
            "A resident of Whitefield has reported severe power fluctuations causing appliance damage. "
            "They request BESCOM to inspect and restore stable power supply immediately."
        ),
        "next_steps": (
            "1. Submit this letter at the nearest BESCOM subdivision office in Whitefield.\n"
            "2. Note the acknowledgement/reference number you receive.\n"
            "3. Call BESCOM helpline 1912 if no action is taken within 48 hours."
        ),
        "clarify_question": None,
    },
    "bwssb_jayanagar": {
        "action": "generate",
        "intent": "BWSSB",
        "transcript": "We have had no water supply in Jayanagar 4th block for three days.",
        "language": "en",
        "kannada_letter": (
            "ಸೇವೆಗೆ,\n"
            "ಬಿಡಬ್ಲ್ಯೂಎಸ್‌ಎಸ್‌ಬಿ ಅಧಿಕಾರಿಗಳಿಗೆ,\n"
            "ಜಯನಗರ ವಿಭಾಗ, ಬೆಂಗಳೂರು.\n\n"
            "ವಿಷಯ: ನೀರು ಸರಬರಾಜು ಸ್ಥಗಿತ ದೂರು – ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್\n\n"
            "ಮಾನ್ಯರೇ,\n\n"
            "ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್‌ನಲ್ಲಿ ಕಳೆದ ಮೂರು ದಿನಗಳಿಂದ ನೀರು ಸರಬರಾಜು ಸಂಪೂರ್ಣ ನಿಂತಿದೆ. "
            "ಇದರಿಂದ ನಿವಾಸಿಗಳಿಗೆ ತೀವ್ರ ತೊಂದರೆಯಾಗುತ್ತಿದೆ.\n\n"
            "ದಯವಿಟ್ಟು ತಕ್ಷಣ ನೀರು ಸರಬರಾಜು ಪುನಃಸ್ಥಾಪಿಸಬೇಕೆಂದು ಕೋರುತ್ತೇನೆ.\n\n"
            "ವಿಧೇಯವಾಗಿ,\n"
            "ಅರ್ಜಿದಾರರು"
        ),
        "summary": (
            "Residents of Jayanagar 4th Block have had no water supply for three consecutive days. "
            "They request BWSSB to restore supply urgently."
        ),
        "next_steps": (
            "1. Submit this letter at the BWSSB Jayanagar divisional office.\n"
            "2. Call BWSSB helpline 1916 to register a complaint and get a ticket number.\n"
            "3. Keep a copy of the letter for follow-up."
        ),
        "clarify_question": None,
    },
    "rental_koramangala": {
        "action": "generate",
        "intent": "Rental",
        "transcript": "My landlord in Koramangala is refusing to return my security deposit of 1 lakh rupees after I vacated.",
        "language": "en",
        "kannada_letter": (
            "ಸೇವೆಗೆ,\n"
            "ಮಾನ್ಯ ಬಾಡಿಗೆ ನ್ಯಾಯಾಲಯ / ಸಿವಿಲ್ ನ್ಯಾಯಾಲಯ,\n"
            "ಕೊರಮಂಗಲ, ಬೆಂಗಳೂರು.\n\n"
            "ವಿಷಯ: ಭದ್ರತಾ ಠೇವಣಿ ಮರುಪಾವತಿ ನಿರಾಕರಣೆ ದೂರು\n\n"
            "ಮಾನ್ಯರೇ,\n\n"
            "ನಾನು ಕೊರಮಂಗಲದಲ್ಲಿ ಬಾಡಿಗೆ ಮನೆಯಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದು, ಮನೆ ಖಾಲಿ ಮಾಡಿದ ನಂತರ "
            "ಮನೆ ಮಾಲೀಕರು ₹1,00,000 ಭದ್ರತಾ ಠೇವಣಿ ಮರುಪಾವತಿಸಲು ನಿರಾಕರಿಸುತ್ತಿದ್ದಾರೆ.\n\n"
            "ಕರ್ನಾಟಕ ಬಾಡಿಗೆ ನಿಯಂತ್ರಣ ಕಾಯಿದೆ 2001ರ ಪ್ರಕಾರ ಠೇವಣಿ ಮರುಪಾವತಿ ಕಡ್ಡಾಯ. "
            "ದಯವಿಟ್ಟು ಸೂಕ್ತ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ಕೋರುತ್ತೇನೆ.\n\n"
            "ವಿಧೇಯವಾಗಿ,\n"
            "ಅರ್ಜಿದಾರರು"
        ),
        "summary": (
            "A tenant in Koramangala is seeking return of a ₹1,00,000 security deposit after vacating the property. "
            "The landlord is refusing to refund despite the tenant vacating. "
            "Under the Karnataka Rent Control Act 2001, return of deposit is mandatory."
        ),
        "next_steps": (
            "1. Send a legal notice to the landlord via a registered lawyer or via RPAD post.\n"
            "2. File a complaint at the Rent Control Court in Koramangala if the landlord does not respond in 15 days.\n"
            "3. Keep all rental agreements, payment receipts, and vacating proof ready."
        ),
        "clarify_question": None,
    },
}


# ---------------------------------------------------------------------------
# Helper: generate PDF from Kannada letter text
# ---------------------------------------------------------------------------
def _generate_pdf(kannada_letter: str, summary: str) -> bytes:
    """Generate a PDF from the Kannada letter using reportlab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import pathlib

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    # Try to register a Unicode font for Kannada script.
    # If a system Noto font is available, use it; else fall back to Helvetica (English only).
    _FONT_NAME = "Helvetica"
    _noto_paths = [
        "/usr/share/fonts/truetype/noto/NotoSansKannada-Regular.ttf",
        "C:/Windows/Fonts/NotoSansKannada-Regular.ttf",
    ]
    for _p in _noto_paths:
        if pathlib.Path(_p).exists():
            pdfmetrics.registerFont(TTFont("NotoKannada", _p))
            _FONT_NAME = "NotoKannada"
            break

    body_style = ParagraphStyle(
        "body",
        parent=styles["Normal"],
        fontName=_FONT_NAME,
        fontSize=11,
        leading=18,
    )
    heading_style = ParagraphStyle(
        "heading",
        parent=styles["Heading2"],
        fontName=_FONT_NAME,
        fontSize=13,
        spaceAfter=8,
    )

    story = []
    story.append(Paragraph("SahayaVoice – Civic Complaint Letter", heading_style))
    story.append(Spacer(1, 0.3 * cm))

    for line in kannada_letter.splitlines():
        story.append(Paragraph(line or " ", body_style))

    if summary:
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph("English Summary", heading_style))
        story.append(Paragraph(summary, body_style))

    doc.build(story)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["meta"])
async def health_check():
    """Service health check."""
    return {"status": "ok", "service": "sahayavoice-api", "version": "0.1.0"}


@app.post("/api/transcribe", tags=["stt"])
async def transcribe_endpoint(
    audio: UploadFile = File(...),
    language: str = Form(default="en"),
):
    """
    POST /api/transcribe
    Accepts an audio file (WebM/WAV/OGG) and returns transcript + detected language.
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file.")
    try:
        result = transcribe_audio(audio_bytes, hint_language=language)
        return result.to_dict()
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=f"Transcription error: {exc}")


@app.post("/api/process-voice", tags=["llm"])
async def process_voice_endpoint(req: ProcessVoiceRequest):
    """
    POST /api/process-voice
    Takes transcript + language → returns AgentResponse (clarify or generate).
    """
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="transcript is required.")

    session_id = req.session_id or str(uuid.uuid4())
    try:
        result = process_voice_input(
            transcript=req.transcript,
            language=req.language,
            session_id=session_id,
            context=req.context,
        )
        return result.to_dict()
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Voice processing failed")
        raise HTTPException(status_code=500, detail=f"Processing error: {exc}")


@app.post("/api/speak", tags=["tts"])
async def speak_endpoint(req: SpeakRequest):
    """
    POST /api/speak
    Converts text to speech and streams MP3 audio bytes.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required.")
    try:
        audio_bytes = synthesise_speech(
            text=req.text,
            language=req.language,  # type: ignore[arg-type]
            voice_id=req.voice_id,
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as exc:
        logger.exception("TTS failed")
        raise HTTPException(status_code=500, detail=f"TTS error: {exc}")


@app.post("/api/demo-preset", tags=["demo"])
async def demo_preset_endpoint(req: DemoPresetRequest):
    """
    POST /api/demo-preset
    Returns a pre-generated VoiceResult for one of the 3 demo scenarios.
    Language field is ignored (presets include their own canned Kannada output).
    """
    preset = _DEMO_PRESETS.get(req.preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Unknown preset: {req.preset_id}")
    return preset


@app.post("/api/download-pdf", tags=["pdf"])
async def download_pdf_endpoint(req: DownloadPdfRequest):
    """
    POST /api/download-pdf
    Generates a PDF from the Kannada letter and returns it as a downloadable file.
    """
    if not req.kannada_letter.strip():
        raise HTTPException(status_code=400, detail="kannada_letter is required.")
    try:
        pdf_bytes = _generate_pdf(req.kannada_letter, req.summary)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=sahayavoice_complaint.pdf"},
        )
    except Exception as exc:
        logger.exception("PDF generation failed")
        raise HTTPException(status_code=500, detail=f"PDF error: {exc}")


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
