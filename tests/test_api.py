"""
Tests – Member 5: FastAPI endpoints
Run:  pytest tests/ -v
"""

import base64
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app

# ---------------------------------------------------------------------------
# Shared mocks
# ---------------------------------------------------------------------------

MOCK_STT = {
    "transcript": "ನಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ",
    "language_code": "kn",
    "language_name": "Kannada",
    "engine": "sarvam",
    "is_kanglish": False,
}
MOCK_LLM = "ಬಿಬಿಎಂಪಿ ಅಧಿಕಾರಿಗಳಿಗೆ, ನಮ್ಮ ರಸ್ತೆಯ ಮೇಲೆ ಒಂದು ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ."
MOCK_TTS_B64 = base64.b64encode(b"fake-audio-bytes").decode()

# Minimal WAV bytes (silence)
import io, struct

def _make_wav() -> bytes:
    data = bytes(3200)
    buf = io.BytesIO()
    buf.write(b"RIFF"); buf.write(struct.pack("<I", 36 + len(data)))
    buf.write(b"WAVEfmt "); buf.write(struct.pack("<IHHIIHH", 16, 1, 1, 16000, 32000, 2, 16))
    buf.write(b"data"); buf.write(struct.pack("<I", len(data))); buf.write(data)
    return buf.getvalue()

WAV_BYTES = _make_wav()


# ---------------------------------------------------------------------------
# Async client fixture
# ---------------------------------------------------------------------------

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# /api/process-voice
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_process_voice_success(client):
    with patch("backend.routers.voice.transcribe_audio", new=AsyncMock(return_value=MOCK_STT)), \
         patch("backend.routers.voice.generate_response", new=AsyncMock(return_value=MOCK_LLM)), \
         patch("backend.routers.voice.synthesize_speech", new=AsyncMock(return_value=MOCK_TTS_B64)):
        r = await client.post(
            "/api/process-voice",
            files={"audio": ("test.wav", WAV_BYTES, "audio/wav")},
            data={"hint_language": "kn"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["stt"]["language_code"] == "kn"
    assert body["response"]["text"] == MOCK_LLM
    assert body["response"]["audio_base64"] == MOCK_TTS_B64
    assert "session_id" in body


@pytest.mark.asyncio
async def test_process_voice_unsupported_mime(client):
    r = await client.post(
        "/api/process-voice",
        files={"audio": ("test.txt", b"not audio", "text/plain")},
    )
    assert r.status_code == 415


@pytest.mark.asyncio
async def test_process_voice_empty_file(client):
    with patch("backend.routers.voice.transcribe_audio", new=AsyncMock(return_value={**MOCK_STT, "transcript": ""})):
        r = await client.post(
            "/api/process-voice",
            files={"audio": ("test.wav", WAV_BYTES, "audio/wav")},
        )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# /api/demo-preset
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_demo_preset_valid(client):
    with patch("backend.routers.demo.generate_response", new=AsyncMock(return_value=MOCK_LLM)), \
         patch("backend.routers.demo.synthesize_speech", new=AsyncMock(return_value=MOCK_TTS_B64)):
        r = await client.post("/api/demo-preset", json={"preset_name": "kannada_pothole"})
    assert r.status_code == 200
    body = r.json()
    assert body["preset"] == "kannada_pothole"
    assert body["stt"]["language_code"] == "kn"
    assert body["response"]["text"] == MOCK_LLM


@pytest.mark.asyncio
async def test_demo_preset_unknown(client):
    r = await client.post("/api/demo-preset", json={"preset_name": "nonexistent"})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_demo_preset_list(client):
    r = await client.get("/api/demo-preset/list")
    assert r.status_code == 200
    names = [p["name"] for p in r.json()["presets"]]
    assert "kannada_pothole" in names
    assert "hindi_water" in names
    assert "kanglish_pothole" in names
