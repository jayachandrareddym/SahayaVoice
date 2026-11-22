"""
Tests – Member 4: MultilingualTranscriber
Run:  pytest tests/ -v
"""

import io
import struct
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# Minimal valid WAV bytes (silence, 16-bit PCM, mono, 16 kHz, 0.1 s)
# ---------------------------------------------------------------------------

def _make_wav(n_samples: int = 1600, sample_rate: int = 16_000) -> bytes:
    data = bytes(n_samples * 2)  # all zeros → silence
    buf = io.BytesIO()
    buf.write(b"RIFF")
    buf.write(struct.pack("<I", 36 + len(data)))
    buf.write(b"WAVEfmt ")
    buf.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
    buf.write(b"data")
    buf.write(struct.pack("<I", len(data)))
    buf.write(data)
    return buf.getvalue()


SILENCE_WAV = _make_wav()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def transcriber():
    with patch("whisper.load_model") as mock_load:
        mock_model = MagicMock()
        mock_model.device = "cpu"
        mock_model.detect_language.return_value = (None, {"hindi": 0.95})
        mock_load.return_value = mock_model

        from backend.pipeline.stt import MultilingualTranscriber
        t = MultilingualTranscriber(whisper_model="base", use_sarvam=False)
        return t


# ---------------------------------------------------------------------------
# Language detection tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("hint,expected_code,expected_name", [
    ("kn", "kn", "Kannada"),
    ("hi", "hi", "Hindi"),
    ("ta", "ta", "Tamil"),
    ("te", "te", "Telugu"),
    ("en", "en", "English"),
])
def test_supported_languages(transcriber, hint, expected_code, expected_name):
    with patch.object(transcriber, "_load_and_denoise", return_value=(np.zeros(16_000), 16_000)), \
         patch.object(transcriber, "_whisper_stt", return_value="test transcript"):
        result = transcriber.transcribe(SILENCE_WAV, hint_language=hint)
        assert result["language_code"] == expected_code
        assert result["language_name"] == expected_name
        assert result["transcript"] == "test transcript"


def test_unknown_language_defaults_to_english(transcriber):
    with patch.object(transcriber, "_load_and_denoise", return_value=(np.zeros(16_000), 16_000)), \
         patch.object(transcriber, "_whisper_stt", return_value="hello"):
        result = transcriber.transcribe(SILENCE_WAV, hint_language="xx")
        assert result["language_code"] == "en"


# ---------------------------------------------------------------------------
# Transcript cleaning tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("dirty,clean", [
    ("  hello   [BLANK_AUDIO] world  ", "hello world"),
    ("(inaudible) test [noise]", "test"),
    ("  spaces   everywhere  ", "spaces everywhere"),
    ("[music] intro", "intro"),
])
def test_clean_transcript(transcriber, dirty, clean):
    from backend.pipeline.stt import MultilingualTranscriber
    assert MultilingualTranscriber._clean(dirty) == clean


# ---------------------------------------------------------------------------
# Kanglish detection tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("text,lang,expected", [
    ("ನಮ್ಮ road ಲ್ಲಿ pothole ತುಂಬಾ ಇದೆ please fix ಮಾಡಿ", "kn", True),
    ("ನಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ", "kn", False),  # pure Kannada
    ("Hello world this is English", "en", False),         # not Kannada
    ("हिंदी में बात करें", "hi", False),                  # Hindi, not Kannada
])
def test_kanglish_detection(transcriber, text, lang, expected):
    from backend.pipeline.stt import MultilingualTranscriber
    assert MultilingualTranscriber._is_kanglish(text, lang) is expected


# ---------------------------------------------------------------------------
# Sarvam fallback test
# ---------------------------------------------------------------------------

def test_sarvam_failure_falls_back_to_whisper(transcriber):
    transcriber.use_sarvam = True
    transcriber.sarvam_api_key = "fake-key"
    with patch.object(transcriber, "_load_and_denoise", return_value=(np.zeros(16_000), 16_000)), \
         patch.object(transcriber, "_sarvam_stt", side_effect=Exception("API error")), \
         patch.object(transcriber, "_whisper_stt", return_value="fallback text") as mock_w:
        result = transcriber.transcribe(SILENCE_WAV, hint_language="kn")
        mock_w.assert_called_once()
        assert result["engine"] == "whisper"
        assert result["transcript"] == "fallback text"
