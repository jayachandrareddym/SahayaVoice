"""
SahayaVoice – FastAPI Backend Entry Point
Member 1 (Task 1): Architecture scaffold and integration wiring.
Actual endpoint logic lives in the pipeline modules owned by M4–M7.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
# from pipeline.tts import router as tts_router       # M7
#
# app.include_router(stt_router,  prefix="/api", tags=["stt"])
# app.include_router(llm_router,  prefix="/api", tags=["llm"])
# app.include_router(tts_router,  prefix="/api", tags=["tts"])


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
