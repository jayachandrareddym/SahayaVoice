"""
Member 5 – Backend & API Developer
FastAPI application – orchestrates STT → LLM → TTS pipeline.

Endpoints:
  POST /api/process-voice   – audio upload → full pipeline response
  POST /api/demo-preset     – preset text scenarios (no mic needed)
  GET  /api/demo-preset/list
  GET  /health
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import voice, demo

app = FastAPI(
    title="SahayaVoice API",
    description=(
        "Multilingual Voice AI civic assistant for Bengaluru. "
        "Supports Kannada, Hindi, Tamil, Telugu, English and Kanglish."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice.router, prefix="/api", tags=["Voice Pipeline"])
app.include_router(demo.router, prefix="/api", tags=["Demo Presets"])


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    """Liveness probe."""
    return {"status": "ok", "service": "SahayaVoice"}
