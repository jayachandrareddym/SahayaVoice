<div align="center">

# 🎙 SahayaVoice

### *Your Voice. Your Language. Your Rights.*

**A real-time, multilingual, dialect-aware Voice AI civic assistant for Bengaluru**

[![IBM Bobathon](https://img.shields.io/badge/IBM-Bobathon%202026-054ADA?style=flat-square&logo=ibm&logoColor=white)](https://github.com/jayachandrareddym/SahayaVoice)
[![Voice AI Track](https://img.shields.io/badge/Track-Voice%20AI-7C3AED?style=flat-square)](https://github.com/jayachandrareddym/SahayaVoice)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![IBM Granite](https://img.shields.io/badge/LLM-IBM%20Granite-054ADA?style=flat-square&logo=ibm&logoColor=white)](https://www.ibm.com/watsonx)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

[**Live Demo**](#-quick-start) · [**API Docs**](http://localhost:8000/docs) · [**Team Tasks**](./MEMBER_TASKS.md) · [**Architecture**](#-architecture)

</div>

---

## 🧭 Overview

**SahayaVoice** bridges the language and bureaucracy gap for Bengaluru's migrant workers, gig-economy delivery partners, and senior citizens who struggle to navigate civic services due to language barriers.

A user speaks naturally in **Kannada, Hindi, Tamil, Telugu or English** — SahayaVoice transcribes it, extracts the civic intent using **IBM Granite on watsonx.ai**, generates a **formal Kannada complaint letter**, reads it back via **Text-to-Speech**, and exports it as a **downloadable PDF** — all in under 10 seconds.

```
 User speaks  ──▶  STT (Whisper / Sarvam)  ──▶  Intent extraction (IBM Granite)
                                                          │
                              ┌───────────────────────────┘
                              ▼
              Missing fields?  ──Yes──▶  Ask clarifying question (TTS)  ──▶  User replies
                              │
                             No
                              ▼
              Generate formal Kannada complaint letter
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Display text    Play via TTS    Download PDF
```

---

## 🎯 Problem Statement

Filing a simple civic complaint — a **BESCOM power fluctuation**, a **BWSSB water issue**, or a **BBMP garbage grievance** — requires formal Kannada literacy and knowledge of bureaucratic letter formats. Millions of residents in Bengaluru:

- 🔴 Cannot write in formal Kannada script
- 🔴 Don't know which government body to contact
- 🔴 Cannot navigate English-only digital portals

**SahayaVoice solves all three in one voice interaction.**

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎙 **Voice Recording** | Browser-native mic capture with live waveform animation |
| 🌐 **5 Languages** | Kannada · Hindi · Tamil · Telugu · English + Kanglish |
| 🧠 **IBM Granite LLM** | Intent extraction + formal Kannada letter generation via watsonx.ai |
| 🔁 **Clarification Loop** | Asks follow-up questions in the user's language when details are missing |
| 🔊 **Text-to-Speech** | Sarvam AI bulbul (primary) + Microsoft Edge TTS (fallback) |
| 📄 **PDF Export** | Beautifully formatted downloadable complaint letter with Kannada font |
| ⚡ **Demo Presets** | 3 one-click scenarios for judging — no microphone required |
| 📱 **Mobile-First** | Responsive UI designed for 375px+ viewport |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js 14)                      │
│                                                                   │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  VoiceRecorder  │  │  DemoPresets   │  │  KannadaDocCard  │  │
│  │  (M3) Web Audio │  │  (M8) 3 preset │  │  (M7) PDF/TTS    │  │
│  │  MediaRecorder  │  │  scenarios     │  │  play/copy/save  │  │
│  └────────┬────────┘  └───────┬────────┘  └────────▲─────────┘  │
│           │ audio blob        │ preset_id           │ VoiceResult │
└───────────┼───────────────────┼─────────────────────┼────────────┘
            │                   │                     │
            ▼                   ▼                     │
┌─────────────────────────────────────────────────────┴────────────┐
│                     FASTAPI BACKEND (Python)                      │
│                                                                   │
│  POST /api/transcribe     POST /api/process-voice                 │
│  POST /api/speak          POST /api/download-pdf                  │
│  POST /api/demo-preset    GET  /health                            │
│                                                                   │
│  ┌──────────┐  ┌──────────────────┐  ┌──────┐  ┌─────────────┐  │
│  │ stt.py   │  │ sahaya/ (M6)     │  │tts.py│  │  pdf.py     │  │
│  │ (M4)     │  │ agent.py         │  │(M7)  │  │  (M7)       │  │
│  │ Whisper  │  │ intent.py        │  │Sarvam│  │  reportlab  │  │
│  │ Sarvam   │  │ clarifier.py     │  │edge- │  │  NotoKannada│  │
│  │ saarika  │  │ letter.py        │  │tts   │  │  font       │  │
│  └──────────┘  │ detector.py      │  └──────┘  └─────────────┘  │
│                │ schema.py        │                               │
│                └──────────┬───────┘                               │
│                           │                                       │
│                    llm_agent.py                                   │
│          ┌────────────────┼────────────────┐                      │
│          ▼                ▼                ▼                      │
│    IBM Granite        OpenAI GPT       Groq Llama                 │
│    watsonx.ai         (fallback)       (fallback)                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
SahayaVoice/
│
├── 📂 backend/
│   ├── main.py                      ← FastAPI app — all endpoints wired
│   ├── prompts.py                   ← LLM system prompts
│   ├── requirements.txt             ← All Python dependencies
│   └── 📂 pipeline/
│       ├── stt.py                   ← STT module (M4 — implement here)
│       ├── llm_agent.py             ← LLM router: OpenAI / Groq / watsonx
│       ├── tts.py                   ← TTS: Sarvam AI + Edge-TTS fallback ✅
│       ├── pdf.py                   ← PDF generation with Kannada font ✅
│       └── 📂 sahaya/               ← Civic complaint AI engine ✅
│           ├── agent.py             ← Orchestrator (multi-turn + single-shot)
│           ├── intent.py            ← LLM-powered intent extraction
│           ├── clarifier.py         ← Clarification loop & question builder
│           ├── detector.py          ← Missing field detection
│           ├── letter.py            ← Formal Kannada letter generator
│           ├── schema.py            ← Shared Pydantic models
│           └── config.py            ← Settings (pydantic-settings / .env)
│
├── 📂 frontend/
│   ├── package.json
│   └── 📂 src/
│       ├── 📂 app/
│       │   └── page.tsx             ← Root page & language selector (M2)
│       └── 📂 components/
│           ├── VoiceRecorder.tsx    ← Mic capture + live waveform ✅ M3
│           ├── KannadaDocCard.tsx   ← Letter display + TTS + PDF ✅ M7
│           └── DemoPresets.tsx      ← One-click demo scenarios ✅ M8
│
├── 📂 tests/
│   └── test_sahaya.py               ← 15 unit + integration tests ✅ M6
│
├── 📂 resources/
│   └── TEAM_DIVISION.md             ← Original team allocation plan
│
├── MEMBER_TASKS.md                  ← 📋 Per-member step-by-step task list
├── .env.example                     ← All required env vars (copy → .env)
└── README.md
```

---

## 🚦 Build Status

| # | Member | Role | Module | Status |
|---|--------|------|--------|--------|
| **M1** | Team Lead | Architecture & integration | Scaffold, routing, merges | ✅ Done |
| **M2** | Frontend Dev | Next.js UI | `page.tsx` language selector | ✅ Fixed |
| **M3** | Audio Engineer | Voice recording + waveform | `VoiceRecorder.tsx` | ✅ Done |
| **M4** | STT Engineer | Speech-to-Text | `pipeline/stt.py` | 🔴 **TODO** |
| **M5** | Backend Dev | FastAPI orchestration | `/api/process-voice`, `/api/demo-preset` | ✅ Wired |
| **M6** | AI Agent | IBM Granite / Kannada letter | `pipeline/sahaya/` | ✅ Done |
| **M7** | TTS & PDF | Audio + document output | `pipeline/tts.py`, `pipeline/pdf.py` | ✅ Done |
| **M8** | QA & Demo | Tests + demo presets | `DemoPresets.tsx`, `tests/` | ⚠️ Font needed |

> 📋 See **[MEMBER_TASKS.md](./MEMBER_TASKS.md)** for each member's exact steps.

---

## 🌐 API Reference

| Method | Endpoint | Owner | Status | Description |
|--------|----------|-------|--------|-------------|
| `GET` | `/health` | M1 | ✅ | Service health check |
| `POST` | `/api/transcribe` | M4 | 🔴 Stub | Audio file → plain-text transcript |
| `POST` | `/api/process-voice` | M5/M6 | ✅ | Transcript → intent → Kannada letter |
| `POST` | `/api/speak` | M7 | ✅ | Text → base64 MP3 audio |
| `POST` | `/api/download-pdf` | M7 | ✅ | Kannada letter → PDF download |
| `POST` | `/api/demo-preset` | M5/M8 | ✅ | Preset ID → pre-filled VoiceResult |

### Sample: `/api/process-voice`
```bash
curl -X POST http://localhost:8000/api/process-voice \
  -H "Content-Type: application/json" \
  -d '{"transcript": "No water supply in Jayanagar for 2 days", "language": "en"}'
```
```json
{
  "transcript": "No water supply in Jayanagar for 2 days",
  "language": "en",
  "kannada_letter": "ಮಾನ್ಯ ಅಧಿಕಾರಿಗಳಿಗೆ,\n\nವಿಷಯ: ನೀರು ಸರಬರಾಜು ...",
  "summary": "BWSSB complaint: No water supply in Jayanagar for 2 days.",
  "next_steps": "Call BWSSB helpline 1916 or visit the nearest BWSSB office.",
  "action": "generate"
}
```

### Sample: `/api/demo-preset`
```bash
curl -X POST http://localhost:8000/api/demo-preset \
  -H "Content-Type: application/json" \
  -d '{"preset_id": "bescom_whitefield", "language": "en"}'
```

**Available `preset_id` values:**
- `bescom_whitefield` — BESCOM power fluctuation, Whitefield
- `bwssb_jayanagar` — BWSSB no water supply, Jayanagar
- `rental_koramangala` — Landlord deposit dispute, Koramangala

---

## ⚡ Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| Git | 2.x |

### 1 · Clone & configure

```bash
git clone https://github.com/jayachandrareddym/SahayaVoice.git
cd SahayaVoice
cp .env.example .env
# → Open .env and fill in your API keys (see table below)
```

### 2 · Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start API server
uvicorn main:app --reload --port 8000
```

🟢 Backend running at **http://localhost:8000**
📖 Interactive API docs at **http://localhost:8000/docs**

### 3 · Frontend

```bash
cd frontend
npm install
npm run dev
```

🟢 Frontend running at **http://localhost:3000**

---

## 🔑 Environment Variables

Copy `.env.example` → `.env` and fill in the values:

```env
# ── OpenAI (Whisper STT + GPT fallback) ─────────────────────────────
OPENAI_API_KEY=sk-...

# ── IBM watsonx.ai / Granite (Primary LLM) ──────────────────────────
WATSONX_API_KEY=your-ibm-cloud-api-key
WATSONX_PROJECT_ID=your-watsonx-project-id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-3-8b-instruct

# ── Sarvam AI (Indian STT + TTS) ────────────────────────────────────
SARVAM_API_KEY=your-sarvam-key

# ── Backend selector ─────────────────────────────────────────────────
LLM_BACKEND=watsonx        # watsonx | openai | groq
STT_BACKEND=whisper_api    # whisper_api | whisper_local

# ── Optional: Groq (faster LLM, free tier) ──────────────────────────
GROQ_API_KEY=gsk_...
```

| Variable | Used By | Required |
|----------|---------|----------|
| `OPENAI_API_KEY` | M4 STT (Whisper) | ✅ For voice input |
| `WATSONX_API_KEY` | M6 LLM (Granite) | ✅ For letter generation |
| `WATSONX_PROJECT_ID` | M6 LLM | ✅ |
| `SARVAM_API_KEY` | M4 STT + M7 TTS | ⚠️ Better Indian language quality |
| `GROQ_API_KEY` | M6 LLM (optional) | Optional faster alternative |

---

## 🌿 Branch Strategy

```
main  ◀──── integration target (M1 merges here)
 │
 ├── task-1-vinay              ✅ Merged  (M1 — scaffold)
 ├── task-2-frontend           ✅ Fixed   (M2 — UI)
 ├── task-3-voice-recorder     ✅ Merged  (M3 — audio)
 ├── task-4-stt                🔴 TODO   (M4 — STT)
 ├── task-5-backend            ✅ Wired   (M5 — endpoints)
 ├── feature/member-6-ai-agent ✅ Merged  (M6 — AI agent)
 ├── task-7-tts-pdf            ✅ Merged  (M7 — TTS + PDF)
 └── task-8-qa                 🔴 TODO   (M8 — tests + font)
```

> **Rule:** Every member commits to their own branch and opens a PR → M1 reviews and merges.

---

## 📋 Pending Work (Critical Path to Demo)

### 🔴 Must complete before judging

| # | Member | Task | File |
|---|--------|------|------|
| 1 | **M4** | Implement `transcribe_audio()` with Whisper or Sarvam | `backend/pipeline/stt.py` |
| 2 | **M7** | Add `NotoSansKannada-Regular.ttf` to `backend/fonts/` | Kannada PDF rendering |
| 3 | **M8** | Run `pytest tests/` and confirm all 15 tests pass | `tests/test_sahaya.py` |

### 🟡 Strongly recommended

| # | Member | Task |
|---|--------|------|
| 4 | **M3** | Add `audio/mp4` MIME fallback for Safari users |
| 5 | **M6** | End-to-end test with real `WATSONX_API_KEY` credentials |
| 6 | **M8** | Improve Kannada letter content in `_DEMO_PRESETS` in `main.py` |

---

## 🧪 Running Tests

```bash
cd backend
pip install pytest pytest-asyncio
python -m pytest tests/test_sahaya.py -v
```

Expected: **15 tests passing** ✅

---

## 🔄 Complete MVP Flow

```
1. 🎙  User taps "Speak" → browser requests microphone
2. 🎵  Audio recorded as WebM/OGG → waveform animates live
3. 📤  Audio POST'd to /api/transcribe → Whisper returns transcript
4. 🧠  Transcript POST'd to /api/process-voice → IBM Granite extracts intent
5. ❓  Missing details? Agent asks follow-up in user's language via TTS
6. 📝  All details collected → formal Kannada complaint letter generated
7. 👁  Split-view card shows transcript + Kannada letter side by side
8. 🔊  "▶ Play" reads letter aloud via Sarvam bulbul TTS
9. 📋  "Copy Text" copies Kannada letter to clipboard
10. 📥  "Download PDF" generates formatted PDF with Kannada script
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 + React 18 | UI framework |
| Styling | Tailwind CSS | Utility-first CSS |
| Audio capture | Web Audio API + MediaRecorder | Browser mic recording |
| Backend | FastAPI + Uvicorn | Python REST API |
| STT | OpenAI Whisper / Sarvam saarika | Speech-to-Text |
| LLM | IBM Granite 3 (watsonx.ai) | Intent + letter generation |
| LLM fallback | OpenAI GPT-4o / Groq Llama 3 | Alternative backends |
| TTS | Sarvam AI bulbul / Edge-TTS | Text-to-Speech |
| PDF | ReportLab + Noto Sans Kannada | PDF document generation |
| Validation | Pydantic v2 | Data models |
| Config | pydantic-settings | Env-based configuration |
| Testing | pytest + pytest-asyncio | Unit + integration tests |

---

## 👥 Team

| Member | Role | Key Deliverable |
|--------|------|-----------------|
| **M1** – Team Lead | Architecture & IBM Bob integration | End-to-end working app |
| **M2** – Frontend Dev | Next.js UI, language selector | Functional web interface |
| **M3** – Audio Engineer | Mic recording, waveform | Voice recording module |
| **M4** – STT Engineer | Whisper / Sarvam integration | Multilingual transcription |
| **M5** – Backend Dev | FastAPI routes, orchestration | Backend API layer |
| **M6** – AI Engineer | IBM Granite agent, Kannada letter | Complaint generation engine |
| **M7** – TTS & PDF | Voice output, PDF download | Audio + document output |
| **M8** – QA & Demo | Tests, demo presets, presentation | Tested MVP + demo |

---

## 📄 License

MIT © 2026 SahayaVoice Team — IBM Bobathon, Voice AI Track, Bengaluru

---

<div align="center">

**Built with ❤️ for Bengaluru · Powered by IBM watsonx.ai**

*SahayaVoice — ಸಹಾಯ ವಾಯ್ಸ್ — सहाय वॉइस*

</div>
