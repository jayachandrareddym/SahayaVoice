"""
POST /api/demo-preset  – run a predefined multilingual scenario (no mic needed).
GET  /api/demo-preset/list – list available preset names.

Useful for hackathon live demos and integration tests.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.services.llm_service import generate_response
from backend.services.tts_service import synthesize_speech

router = APIRouter()

# ---------------------------------------------------------------------------
# Preset catalogue
# ---------------------------------------------------------------------------

PRESETS: dict[str, dict] = {
    "kannada_pothole": {
        "transcript": "ನಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ, ದಯವಿಟ್ಟು ಸರಿಪಡಿಸಿ",
        "language_code": "kn",
        "description": "Kannada – pothole complaint",
    },
    "hindi_water": {
        "transcript": "हमारे इलाके में पिछले तीन दिनों से पानी नहीं आ रहा है",
        "language_code": "hi",
        "description": "Hindi – water supply complaint",
    },
    "english_streetlight": {
        "transcript": "The streetlight on MG Road near the bus stop has been broken for a week",
        "language_code": "en",
        "description": "English – streetlight complaint",
    },
    "tamil_garbage": {
        "transcript": "எங்கள் தெருவில் குப்பை சேகரிக்கப்படவில்லை, தயவுசெய்து நடவடிக்கை எடுங்கள்",
        "language_code": "ta",
        "description": "Tamil – garbage collection complaint",
    },
    "telugu_drain": {
        "transcript": "మా వీధిలో మురుగు నీరు పొర్లి పారుతోంది, వెంటనే పరిష్కరించండి",
        "language_code": "te",
        "description": "Telugu – drain overflow complaint",
    },
    "kanglish_pothole": {
        "transcript": "ನಮ್ಮ road ಲ್ಲಿ pothole ತುಂಬಾ ಇದೆ, please fix ಮಾಡಿ",
        "language_code": "kn",
        "description": "Kanglish – mixed Kannada+English pothole complaint",
    },
}


class DemoPresetRequest(BaseModel):
    preset_name: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/demo-preset", summary="Run a preset scenario (no audio required)")
async def run_demo_preset(request: DemoPresetRequest) -> JSONResponse:
    """
    Execute a predefined multilingual scenario end-to-end (LLM → TTS)
    without needing a microphone or audio file.  Ideal for live demos.
    """
    preset = PRESETS.get(request.preset_name)
    if not preset:
        raise HTTPException(
            status_code=404,
            detail={
                "error": f"Unknown preset '{request.preset_name}'.",
                "available": list(PRESETS.keys()),
            },
        )

    transcript: str = preset["transcript"]
    lang_code: str = preset["language_code"]

    llm_text = await generate_response(transcript, history=[], lang_code=lang_code)
    tts_b64 = await synthesize_speech(llm_text, lang_code)

    return JSONResponse(
        {
            "preset": request.preset_name,
            "description": preset["description"],
            "stt": {
                "transcript": transcript,
                "language_code": lang_code,
                "language_name": {
                    "kn": "Kannada",
                    "hi": "Hindi",
                    "ta": "Tamil",
                    "te": "Telugu",
                    "en": "English",
                }.get(lang_code, lang_code),
                "engine": "preset",
                "is_kanglish": "kanglish" in request.preset_name,
            },
            "response": {
                "text": llm_text,
                "language_code": lang_code,
                "audio_base64": tts_b64,
            },
        }
    )


@router.get("/demo-preset/list", summary="List available demo presets")
def list_presets() -> dict:
    return {
        "presets": [
            {"name": k, "description": v["description"], "language_code": v["language_code"]}
            for k, v in PRESETS.items()
        ]
    }
