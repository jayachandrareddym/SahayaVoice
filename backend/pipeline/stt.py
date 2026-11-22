"""
Member 4 – Speech-to-Text & Language Detection
Multilingual STT supporting Kannada, Hindi, Tamil, Telugu, English + Kanglish.
Engines: Sarvam AI (primary for Indian languages) + OpenAI Whisper (fallback).
"""

import io
import os
import logging
from typing import Optional

import httpx
import numpy as np
import noisereduce as nr
import torch
import whisper
from langdetect import DetectorFactory
from pydub import AudioSegment

DetectorFactory.seed = 0
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Language mappings
# ---------------------------------------------------------------------------

SUPPORTED_LANGUAGES: dict[str, str] = {
    "kn": "Kannada",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "en": "English",
}

# Whisper uses full language names
WHISPER_LANG_MAP: dict[str, str] = {
    "kn": "kannada",
    "hi": "hindi",
    "ta": "tamil",
    "te": "telugu",
    "en": "english",
}

# Sarvam AI BCP-47 locale codes
SARVAM_LANG_MAP: dict[str, str] = {
    "kn": "kn-IN",
    "hi": "hi-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "en": "en-IN",
}

# Reverse map: Whisper name → ISO 639-1
_WHISPER_TO_ISO: dict[str, str] = {v: k for k, v in WHISPER_LANG_MAP.items()}


class MultilingualTranscriber:
    """
    Transcribe speech audio in Kannada, Hindi, Tamil, Telugu, English and Kanglish.

    Usage::

        t = MultilingualTranscriber()
        result = t.transcribe(audio_bytes, hint_language="kn")
        print(result["transcript"])
    """

    def __init__(
        self,
        whisper_model: str = "medium",
        sarvam_api_key: Optional[str] = None,
        use_sarvam: bool = True,
    ) -> None:
        self.sarvam_api_key = sarvam_api_key or os.getenv("SARVAM_API_KEY", "")
        self.use_sarvam = use_sarvam and bool(self.sarvam_api_key)

        logger.info("Loading Whisper model: %s", whisper_model)
        self.model = whisper.load_model(whisper_model)
        logger.info("Whisper model ready.")

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def transcribe(
        self,
        audio_bytes: bytes,
        hint_language: Optional[str] = None,
    ) -> dict:
        """
        Transcribe *audio_bytes* and return a result dict::

            {
                "transcript":     str,
                "language_code":  str,   # ISO 639-1
                "language_name":  str,
                "engine":         str,   # "sarvam" | "whisper"
                "is_kanglish":    bool,
            }
        """
        audio_arr, sr = self._load_and_denoise(audio_bytes)
        lang = hint_language or self._detect_language(audio_arr)

        if lang not in SUPPORTED_LANGUAGES:
            logger.warning("Unsupported language '%s', defaulting to 'en'.", lang)
            lang = "en"

        raw_text, engine = self._run_stt(audio_bytes, audio_arr, lang)
        transcript = self._clean(raw_text)

        return {
            "transcript": transcript,
            "language_code": lang,
            "language_name": SUPPORTED_LANGUAGES[lang],
            "engine": engine,
            "is_kanglish": self._is_kanglish(transcript, lang),
        }

    # ------------------------------------------------------------------
    # Audio preprocessing
    # ------------------------------------------------------------------

    def _load_and_denoise(self, audio_bytes: bytes) -> tuple[np.ndarray, int]:
        """Decode audio → mono 16 kHz float32 array, then remove noise."""
        seg = AudioSegment.from_file(io.BytesIO(audio_bytes))
        seg = seg.set_channels(1).set_frame_rate(16_000)
        samples = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32_768.0
        denoised = nr.reduce_noise(y=samples, sr=16_000, stationary=False)
        return denoised, 16_000

    # ------------------------------------------------------------------
    # Language detection
    # ------------------------------------------------------------------

    def _detect_language(self, audio_arr: np.ndarray) -> str:
        """Use Whisper's built-in language detector on the first 30 s."""
        try:
            clip = whisper.pad_or_trim(torch.from_numpy(audio_arr).float())
            mel = whisper.log_mel_spectrogram(clip).to(self.model.device)
            _, probs = self.model.detect_language(mel)
            best: str = max(probs, key=probs.get)  # type: ignore[arg-type]
            logger.info("Detected language: %s (p=%.2f)", best, probs.get(best, 0))
            return _WHISPER_TO_ISO.get(best, best[:2] if len(best) >= 2 else "en")
        except Exception as exc:
            logger.warning("Language detection failed (%s); defaulting to 'en'.", exc)
            return "en"

    # ------------------------------------------------------------------
    # STT routing
    # ------------------------------------------------------------------

    def _run_stt(
        self,
        audio_bytes: bytes,
        audio_arr: np.ndarray,
        lang: str,
    ) -> tuple[str, str]:
        """Route to Sarvam AI for Indian languages; fall back to Whisper."""
        if self.use_sarvam and lang != "en":
            try:
                return self._sarvam_stt(audio_bytes, lang), "sarvam"
            except Exception as exc:
                logger.warning("Sarvam STT error (%s); falling back to Whisper.", exc)
        return self._whisper_stt(audio_arr, lang), "whisper"

    def _sarvam_stt(self, audio_bytes: bytes, lang: str) -> str:
        resp = httpx.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": self.sarvam_api_key},
            files={"file": ("audio.wav", audio_bytes, "audio/wav")},
            data={
                "language_code": SARVAM_LANG_MAP[lang],
                "model": "saarika:v2",
                "with_timestamps": "false",
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("transcript", "")

    def _whisper_stt(self, audio_arr: np.ndarray, lang: str) -> str:
        result = self.model.transcribe(
            audio_arr,
            language=WHISPER_LANG_MAP.get(lang, "english"),
            task="transcribe",
            fp16=torch.cuda.is_available(),
            condition_on_previous_text=False,
            temperature=0.0,
        )
        return result["text"]  # type: ignore[index]

    # ------------------------------------------------------------------
    # Post-processing helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _clean(text: str) -> str:
        """Strip Whisper filler tokens and normalise whitespace."""
        for filler in ("[BLANK_AUDIO]", "(inaudible)", "[noise]", "[music]"):
            text = text.replace(filler, "")
        return " ".join(text.split())

    @staticmethod
    def _is_kanglish(text: str, lang: str) -> bool:
        """True when Kannada script words appear alongside Latin words (>20 %)."""
        if lang != "kn":
            return False
        has_kannada = any("\u0C80" <= ch <= "\u0CFF" for ch in text)
        words = text.split()
        latin_ratio = sum(1 for w in words if w.isascii() and w.isalpha()) / max(len(words), 1)
        return has_kannada and latin_ratio > 0.20
