# SahayaVoice – Test Suite
Owner: Member 8 (QA, Demo & Documentation)

## Overview
This directory contains the test plan and test scripts for SahayaVoice.
Run all backend tests from the `backend/` directory with `pytest`.

---

## 1. Prerequisites

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx
cp ../.env.example ../.env       # fill in real API keys
```

---

## 2. Backend – Unit Tests

### 2.1 STT Module (`pipeline/stt.py`)

| Test | Description | Expected |
|------|-------------|----------|
| `test_stt_english` | Upload a short English WAV file | `language == "en"`, transcript non-empty |
| `test_stt_hindi` | Upload a Hindi audio file | `language == "hi"` |
| `test_stt_kannada` | Upload a Kannada audio file | `language == "kn"` |
| `test_stt_no_key` | Call with no env keys set | Raises `EnvironmentError` |

### 2.2 LLM Agent (`pipeline/llm_agent.py`)

| Test | Description | Expected |
|------|-------------|----------|
| `test_intent_bescom` | Transcript: "My electricity bill is wrong in Whitefield" | `intent == "BESCOM"` |
| `test_intent_bwssb` | Transcript: "No water in my area for 2 days" | `intent == "BWSSB"` |
| `test_intent_rental` | Transcript: "Landlord not returning deposit" | `intent == "Rental"` |
| `test_clarification_loop` | Transcript missing area field | `action == "clarify"`, question non-empty |
| `test_letter_generation` | Full details provided | `action == "generate"`, `kannada_letter` contains ಕನ್ನಡ script |
| `test_session_accumulation` | Two-turn session fills missing fields | Final call returns `action == "generate"` |

### 2.3 TTS Module (`pipeline/tts.py`)

| Test | Description | Expected |
|------|-------------|----------|
| `test_tts_english` | Synthesise short English sentence | Returns `bytes`, length > 1000 |
| `test_tts_kannada` | Synthesise Kannada text | Returns `bytes`, length > 1000 |
| `test_tts_fallback` | No `SARVAM_API_KEY` set | Falls back to Edge-TTS, still returns bytes |

---

## 3. Backend – API Integration Tests

Run the FastAPI server (`uvicorn main:app --reload`) then:

```bash
pytest tests/test_api.py -v
```

| Endpoint | Test | Expected |
|----------|------|----------|
| `GET /health` | Basic check | `{"status": "ok"}` |
| `POST /api/transcribe` | Upload sample audio | 200, transcript present |
| `POST /api/process-voice` | Send transcript | 200, `action` in response |
| `POST /api/speak` | Send short text | 200, `Content-Type: audio/mpeg` |
| `POST /api/demo-preset` | `bescom_whitefield` | 200, `kannada_letter` non-empty |
| `POST /api/demo-preset` | `bwssb_jayanagar` | 200, `kannada_letter` non-empty |
| `POST /api/demo-preset` | `rental_koramangala` | 200, `kannada_letter` non-empty |
| `POST /api/download-pdf` | Send Kannada letter | 200, `Content-Type: application/pdf` |
| `POST /api/transcribe` | Empty file | 400 Bad Request |
| `POST /api/process-voice` | Empty transcript | 400 Bad Request |

---

## 4. Frontend – Manual Test Checklist

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| F1 | Language selector | Switch to Hindi | Selector shows हिंदी |
| F2 | Microphone button | Click "Tap to Speak" | Button turns red, waveform animates |
| F3 | Stop recording | Click "Stop" | Status changes to "Processing…" |
| F4 | Microphone denied | Deny browser permission | Error message shown below button |
| F5 | Demo preset – BESCOM | Click ⚡ BESCOM button | KannadaDocCard appears with Kannada letter |
| F6 | Demo preset – BWSSB | Click 💧 BWSSB button | KannadaDocCard appears |
| F7 | Demo preset – Rental | Click 🏠 Rental button | KannadaDocCard appears |
| F8 | Copy text | Click "Copy Text" | Button shows "✓ Copied!" for 2 seconds |
| F9 | Download PDF | Click "Download PDF" | `sahayavoice_complaint.pdf` downloaded |
| F10 | Audio playback | Click "▶ Play" | Browser plays audio confirmation |
| F11 | Clarification flow | Speak without area name | Clarification question shown in blue box |

---

## 5. Language Coverage Matrix

| Language | STT | Clarification Loop | Kannada Letter | TTS Response |
|----------|-----|--------------------|----------------|--------------|
| Kannada (kn) | ✓ | ✓ | ✓ | ✓ |
| Hindi (hi) | ✓ | ✓ | ✓ | ✓ |
| Tamil (ta) | ✓ | ✓ | ✓ | ✓ |
| Telugu (te) | ✓ | ✓ | ✓ | ✓ |
| English (en) | ✓ | ✓ | ✓ | ✓ |
| Kanglish (mixed) | ✓ | ✓ | ✓ | ✓ |

---

## 6. Error Scenario Tests

| Scenario | How to trigger | Expected behaviour |
|----------|----------------|-------------------|
| No API keys set | Remove all keys from `.env` | 503 with helpful message |
| Backend offline | Stop uvicorn | Frontend shows error below button |
| Very short audio | Record 0.5 s of silence | STT returns empty transcript, clarification triggered |
| Network timeout | Throttle network in browser | Frontend shows error message |

---

## 7. Sample Audio Files

Place test audio files here for automated tests:

```
tests/
├── audio/
│   ├── en_bescom.webm       ← "My electricity fluctuates in Whitefield"
│   ├── hi_bwssb.webm        ← "Mere area mein paani nahi hai"
│   ├── kn_bbmp.webm         ← "Namma area alli kasa thariyalla"
│   ├── te_rental.webm       ← "Landlord deposit teesukoledu"
│   └── silence.webm         ← 0.5 s silence (edge case)
└── README.md                ← this file
```

---

## 8. Running All Tests

```bash
# From the backend/ directory
pytest ../tests/ -v --tb=short
```
