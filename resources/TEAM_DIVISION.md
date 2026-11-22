# SahayaVoice – Team Division for 8 Members

(8-member hackathon team plan) (IBM Bobathon – Voice AI Track)

I've reviewed your uploaded **SahayaVoice — Complete Hackathon Blueprint & IBM Bob Context**.

We'll divide the project into 8 independent but coordinated responsibilities so everyone contributes to building one complete product.

**Project:** SahayaVoice – A real-time, multilingual, dialect-aware Voice AI assistant for Bengaluru.

**Goal:** A user speaks in Kannada, Hindi, Tamil, Telugu, English or Kanglish, and SahayaVoice helps generate a formal Kannada civic complaint or administrative letter.

## 1. Team responsibility allocation

**Member 1 – Team Lead & IBM Bob Integration**

(Project coordination)

- Manage overall project architecture.
- Configure IBM Bob and maintain project context.
- Create GitHub repository and branch strategy.
- Coordinate all 7 members.
- Integrate frontend, backend and AI modules.
- Handle final testing and judge presentation.
  **Deliverable:** Working end-to-end application.

**Member 2 – Frontend Developer**

(Next.js / React)

- Build mobile-first dashboard.
- Create homepage and language selection.
- Design recording interface.
- Build responsive layouts.
- Connect frontend with backend APIs.
  **Deliverable:** Functional SahayaVoice web interface.

**Member 3 – Voice Recording & Audio Engineer**

(Web Audio API)

- Develop microphone recording.
- Implement audio upload.
- Create live waveform animation.
- Handle microphone permissions.
- Manage audio formats and recording errors.
  **Deliverable:** Working voice recording and upload module.

**Member 4 – Speech-to-Text & Language Detection**

(STT / Whisper / Sarvam AI)

- Implement speech-to-text.
- Detect Kannada, Hindi, Tamil, Telugu and English.
- Handle Kanglish input where supported.
- Return clean transcripts.
- Test noisy audio and multiple accents.
  **Deliverable:** Multilingual transcription module.

**Member 5 – Backend & API Developer**

(Python / FastAPI)

- Create FastAPI backend.
- Develop `/api/process-voice`.
- Develop `/api/demo-preset`.
- Handle audio uploads and session state.
- Connect STT, LLM and TTS services.
  **Deliverable:** Working backend API and orchestration.

**Member 6 – AI Agent & Kannada Document Generation**

(IBM Granite / watsonx.ai / LLM)

- Build SahayaVoice AI agent.
- Implement intent extraction.
- Implement missing-information detection.
- Build multilingual clarification loop.
- Generate formal Kannada complaint letters.
- Return structured JSON.
  **Deliverable:** Intelligent civic complaint generation engine.

**Member 7 – Text-to-Speech & Document Output**

(TTS / PDF generation)

- Implement multilingual voice responses.
- Generate audio confirmations.
- Build Kannada document preview.
- Implement copy and PDF download.
- Create side-by-side transcript and letter output.
  **Deliverable:** Voice response and downloadable complaint document.

**Member 8 – QA, Demo & Documentation**

(Testing / Presentation)

- Test all five language flows.
- Validate generated Kannada documents.
- Build three one-click demo presets.
- Test microphone and network failure scenarios.
- Prepare README and setup instructions.
- Prepare three-minute judge presentation.
  **Deliverable:** Tested MVP, demo scenarios and presentation.

## 2. Development ownership matrix

| Module | Owner | Support |
|--------|--------|--------|
| Project architecture | M1 | All |
| Next.js UI | M2 | M3 |
| Microphone | M3 | M2 |
| STT & detection | M4 | M5 |
| FastAPI | M5 | M4, M6, M7 |
| AI agent & Kannada | M6 | M4 |
| TTS & PDF | M7 | M2, M6 |
| Testing & demo | M8 | All |

This division follows the frontend, backend, STT, LLM and TTS architecture in your blueprint.

## 3. Shared GitHub repository structure

Use one shared repository, with individual ownership of modules.

```
sahayavoice/
│
├── backend/
│   ├── main.py
│   ├── pipeline/
│   │   ├── stt.py
│   │   ├── llm_agent.py
│   │   └── tts.py
│   ├── prompts.py
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── app/page.tsx
│       └── components/
│           ├── VoiceRecorder.tsx
│           ├── KannadaDocCard.tsx
│           └── DemoPresets.tsx
│
├── tests/
├── README.md
└── .env.example
```

## 4. Suggested development timeline

| Phase | Work | Responsible |
|--------|--------|--------|
| Phase 1 | Architecture, repo and setup | M1 |
| Phase 2 | UI and voice recording | M2, M3 |
| Phase 3 | STT and FastAPI | M4, M5 |
| Phase 4 | LLM and Kannada generation | M6 |
| Phase 5 | TTS and PDF | M7 |
| Phase 6 | Integration and testing | M1, M8 |
| Phase 7 | Demo and presentation | All |

## 5. Rules for all 8 members

1. Every member must work on their assigned module.
2. Commit code to individual Git branches.
3. Never overwrite another member's work without coordination.
4. Every module must have a working demonstration.
5. Use the shared API contract before integrating.
6. Keep API keys in `.env`, never commit secrets.
7. M1 approves integration and M8 verifies functionality.

## 6. IBM Bob prompts for each member

Each member can use IBM Bob independently with this prompt:

You are an expert software engineer working on SahayaVoice, a multilingual Voice AI civic assistant for Bengaluru.

Your responsibility is your assigned module only.

Instructions:

1. Inspect the existing SahayaVoice repository before coding.
2. Understand the existing architecture and dependencies.
3. Implement your assigned module using clean, modular, production-quality code.
4. Do not overwrite or modify other members' modules unnecessarily.
5. Follow existing API contracts and naming conventions.
6. Add error handling and tests.
7. Document installation and execution instructions.
8. Report modified files, completed features, pending tasks and integration requirements.

Do not create duplicate implementations of modules owned by other team members.

## 7. Final expected product

At the end, your team should demonstrate this complete flow:

**1. User speaks**

Hindi / Kannada / Tamil / Telugu / English

**2. Speech-to-Text**

Transcription and language detection

**3. AI Agent**

Intent detection and clarification

**4. Kannada Letter Generation**

Formal civic complaint

**5. Voice Confirmation + PDF**

Ready-to-review document

## 8. Let's finalize your team

I need your eight members' names to personalize the allocation.

**Enter the 8 team members**

[Finalize 8-member team]

**My recommendation:** Keep one person accountable for each module, but make integration a shared responsibility. The goal is one working SahayaVoice product, not eight separate projects.
