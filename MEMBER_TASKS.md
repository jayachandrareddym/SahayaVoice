# 📋 SahayaVoice – Member Task Sheet

> **IBM Bobathon – Voice AI Track**
> This document is the single source of truth for what each member needs to do.
> Read your section, follow the steps in order, commit to your branch, and notify M1 to merge.

---

## ✅ M1 – Team Lead (Vinay)
**Branch:** `main` (integration)
**Status:** ✅ All architecture done. Ongoing integration duty.

### Remaining Tasks
- [ ] Wire `/api/process-voice` in `backend/main.py` → call `pipeline.sahaya.agent.process_full_text()`
- [ ] Wire `/api/demo-preset` in `backend/main.py` → return pre-filled `VoiceResult` JSON
- [ ] Merge M4 and M8 branches when ready
- [ ] Run final end-to-end test before judge demo
- [ ] Confirm `.env` is filled in on demo machine

### Files to touch
- `backend/main.py` – add 2 new endpoints (see M5 section for contract)

---

## ⚠️ M2 – Frontend Developer
**Branch:** `task-2-frontend`
**Status:** ⚠️ Scaffold exists. Fix encoding issues.

### Remaining Tasks
- [ ] Fix broken emoji/unicode characters in `frontend/src/app/page.tsx`
  - Line ~38: Language label characters are garbled – replace with proper Unicode:
    ```tsx
    { code: "kn", label: "ಕನ್ನಡ" },
    { code: "hi", label: "हिन्दी" },
    { code: "ta", label: "தமிழ்" },
    { code: "te", label: "తెలుగు" },
    { code: "en", label: "English" },
    ```
  - Line ~65: Fix header title: replace `dYZT SahayaVoice` → `🎙 SahayaVoice`
- [ ] Make language selector mobile-friendly (larger tap target on mobile)
- [ ] Add a loading spinner overlay when `isProcessing === true`
- [ ] Test UI on mobile viewport (375px width)

### Files to touch
- `frontend/src/app/page.tsx`

### How to run
```bash
cd frontend && npm install && npm run dev
# Open http://localhost:3000
```

---

## ✅ M3 – Voice Recording & Audio Engineer
**Branch:** `task-3-voice-recorder`
**Status:** ✅ Core done and merged. 2 nice-to-have improvements remain.

### Remaining Tasks (nice-to-have)
- [ ] **Safari MIME fallback** – Add `audio/mp4` to MIME detection in `VoiceRecorder.tsx`
  ```tsx
  // Around line ~115 in startRecording()
  const mimeType = MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : MediaRecorder.isTypeSupported("audio/mp4")
    ? "audio/mp4"
    : "audio/ogg";
  ```
- [ ] **Auto-stop at 120s** – In `startRecording()`, add after timer setup:
  ```tsx
  setTimeout(() => { if (state === "recording") stopRecording(); }, 120_000);
  ```
- [ ] Confirm waveform renders correctly on mobile Chrome

### Files to touch
- `frontend/src/components/VoiceRecorder.tsx`

---

## 🔴 M4 – Speech-to-Text & Language Detection  ← PRIORITY
**Branch:** `task-4-stt` (create this branch)
**Status:** 🔴 NOT STARTED – this blocks the entire voice pipeline

### Your Task
Implement `transcribe_audio()` in `backend/pipeline/stt.py`.
The function signature is already there – just fill in the body.

### Step-by-Step
1. Create your branch:
   ```bash
   git checkout main
   git checkout -b task-4-stt
   ```

2. Open `backend/pipeline/stt.py` and implement the function:
   ```python
   def transcribe_audio(audio_bytes: bytes, hint_language: str | None = None) -> TranscriptResult:
   ```

3. **Option A – OpenAI Whisper API** (easiest, needs `OPENAI_API_KEY`):
   ```python
   import io, openai, os
   client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
   audio_file = io.BytesIO(audio_bytes)
   audio_file.name = "audio.webm"
   result = client.audio.transcriptions.create(
       model="whisper-1",
       file=audio_file,
       language=hint_language or None,
       response_format="verbose_json",
   )
   return TranscriptResult(
       transcript=result.text,
       language=result.language or hint_language or "en",
       confidence=0.95,
   )
   ```

4. **Option B – Sarvam AI saarika** (better for Kannada/Hindi, needs `SARVAM_API_KEY`):
   - POST to `https://api.sarvam.ai/speech-to-text`
   - Header: `API-Subscription-Key: <SARVAM_API_KEY>`
   - Body: multipart form with `file` (audio bytes) and `language_code` (e.g. `kn-IN`)

5. Also update the `transcribe` async wrapper (called by `main.py`):
   ```python
   async def transcribe(audio_bytes: bytes, language: str) -> str:
       result = transcribe_audio(audio_bytes, hint_language=language)
       return result.transcript
   ```

6. Commit and open a PR to `main`:
   ```bash
   git add backend/pipeline/stt.py
   git commit -m "feat(M4): implement Whisper STT transcription"
   git push origin task-4-stt
   ```

### Files to touch
- `backend/pipeline/stt.py` – implement `transcribe_audio()` and `transcribe()`

### Environment variable needed
```
OPENAI_API_KEY=sk-...        # for Whisper API
# OR
SARVAM_API_KEY=...           # for Sarvam saarika
```

---

## 🔴 M5 – Backend & API Developer  ← PRIORITY
**Branch:** `task-5-backend` (create this branch)
**Status:** 🔴 NOT STARTED – `/api/process-voice` and `/api/demo-preset` are missing

### Your Task
Wire the two missing endpoints in `backend/main.py`.

### Step-by-Step
1. Create your branch:
   ```bash
   git checkout main
   git checkout -b task-5-backend
   ```

2. **Add `/api/process-voice`** in `backend/main.py` after the existing `/api/transcribe` endpoint:
   ```python
   class ProcessVoiceRequest(BaseModel):
       transcript: str
       language:   str = "en"

   @app.post("/api/process-voice", tags=["agent"])
   async def process_voice(req: ProcessVoiceRequest):
       """Transcript → intent extraction → Kannada letter (M6 agent)."""
       from pipeline.sahaya.agent import process_full_text
       from pipeline.sahaya.schema import SahayaResult
       result: SahayaResult = await process_full_text(req.transcript)
       if result.status == "failed":
           raise HTTPException(status_code=500, detail=result.error or "Agent failed")
       letter = result.complaint_letter
       return {
           "transcript":       req.transcript,
           "language":         req.language,
           "kannada_letter":   letter.kannada_letter if letter else "",
           "summary":          letter.english_summary if letter else "",
           "next_steps":       "Print and submit to your ward office or upload to BBMP portal.",
           "action":           "generate",
       }
   ```

3. **Add `/api/demo-preset`** (coordinate with M8 for preset content):
   ```python
   class DemoPresetRequest(BaseModel):
       preset_id: str
       language:  str = "en"

   DEMO_PRESETS = {
       "bescom_whitefield": {
           "transcript": "There is power fluctuation in my area since 3 days, Whitefield",
           "language": "en",
           "kannada_letter": "ಮಾನ್ಯರೇ,\n\nನಾನು ವೈಟ್‌ಫೀಲ್ಡ್ ನಿವಾಸಿ...",
           "summary": "BESCOM power fluctuation complaint for Whitefield area.",
           "next_steps": "Submit to BESCOM office or call 1912.",
           "action": "generate",
       },
       "bwssb_jayanagar": {
           "transcript": "No water supply in Jayanagar 4th block for 2 days",
           "language": "en",
           "kannada_letter": "ಮಾನ್ಯರೇ,\n\nಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್‌ನಲ್ಲಿ...",
           "summary": "BWSSB no water supply complaint for Jayanagar.",
           "next_steps": "Call BWSSB helpline 1916 or visit nearest office.",
           "action": "generate",
       },
       "rental_koramangala": {
           "transcript": "My landlord is not returning security deposit in Koramangala",
           "language": "en",
           "kannada_letter": "ಮಾನ್ಯರೇ,\n\nಕೋರಮಂಗಲದಲ್ಲಿ ನನ್ನ ಮನೆ ಮಾಲೀಕರು...",
           "summary": "Security deposit non-refund dispute in Koramangala.",
           "next_steps": "File complaint at Lok Adalat or civil court.",
           "action": "generate",
       },
   }

   @app.post("/api/demo-preset", tags=["demo"])
   async def demo_preset(req: DemoPresetRequest):
       """Return a pre-filled VoiceResult for demo/judging (M8 owns content)."""
       preset = DEMO_PRESETS.get(req.preset_id)
       if not preset:
           raise HTTPException(status_code=404, detail=f"Unknown preset: {req.preset_id!r}")
       return {**preset, "language": req.language}
   ```

4. Commit and push:
   ```bash
   git add backend/main.py
   git commit -m "feat(M5): wire /api/process-voice and /api/demo-preset endpoints"
   git push origin task-5-backend
   ```

### Files to touch
- `backend/main.py` – add 2 new endpoints + 2 new Pydantic models

---

## ✅ M6 – AI Agent & Kannada Document Generation
**Branch:** `feature/member-6-ai-agent`
**Status:** ✅ Done and merged. Agent, intent, clarification, letter generation all working.

### Remaining Tasks
- [ ] Run `python -m pytest tests/test_sahaya.py -v` and confirm all 15 tests pass
- [ ] Verify `WATSONX_API_KEY` works end-to-end with real IBM watsonx.ai credentials
- [ ] Add Kannada complaint templates for M8's 3 demo scenarios in `letter.py` if needed

### Files already done
- `backend/pipeline/sahaya/agent.py`
- `backend/pipeline/sahaya/intent.py`
- `backend/pipeline/sahaya/clarifier.py`
- `backend/pipeline/sahaya/detector.py`
- `backend/pipeline/sahaya/letter.py`
- `backend/pipeline/sahaya/schema.py`
- `backend/pipeline/sahaya/config.py`
- `tests/test_sahaya.py`

---

## ✅ M7 – Text-to-Speech & Document Output
**Branch:** `task-7-tts-pdf`
**Status:** ✅ Done and merged. TTS (Sarvam + edge-tts), PDF generation, KannadaDocCard all working.

### Remaining Tasks
- [ ] **Add Kannada font** – Download `NotoSansKannada-Regular.ttf` and place at:
  `backend/fonts/NotoSansKannada-Regular.ttf`
  Without this, Kannada characters in PDF fall back to Helvetica (squares/blanks).
  Download: https://fonts.google.com/noto/specimen/Noto+Sans+Kannada
- [ ] Confirm `edge-tts` and `reportlab` are in `backend/requirements.txt` ✅ (already added)
- [ ] Test PDF download button in browser with real Kannada text

### Files already done
- `backend/pipeline/tts.py`
- `backend/pipeline/pdf.py`
- `frontend/src/components/KannadaDocCard.tsx`

---

## 🔴 M8 – QA, Demo & Documentation  ← PRIORITY
**Branch:** `task-8-qa` (create this branch)
**Status:** 🔴 NOT STARTED – demo presets and test coverage needed for judging

### Your Task
1. Fill in real Kannada letter content for the 3 demo presets
2. Wire `DemoPresets.tsx` to call `/api/demo-preset`
3. Run test suite and add missing tests

### Step-by-Step
1. Create your branch:
   ```bash
   git checkout main
   git checkout -b task-8-qa
   ```

2. **Wire DemoPresets.tsx** – open `frontend/src/components/DemoPresets.tsx`
   Replace the `handlePreset` function body:
   ```tsx
   const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

   const handlePreset = async (presetId: string) => {
     try {
       const res = await fetch(`${BACKEND_URL}/api/demo-preset`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ preset_id: presetId, language }),
       });
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       const result = await res.json();
       onPresetSelected(result);
     } catch (err) {
       console.error("Demo preset failed:", err);
     }
   };
   ```

3. **Improve the 3 preset Kannada letters** – coordinate with M5/M6 to replace stub letters
   with real, formal Kannada complaint text in `backend/main.py` `DEMO_PRESETS` dict.

4. **Run tests**:
   ```bash
   cd backend
   pip install pytest pytest-asyncio
   python -m pytest tests/test_sahaya.py -v
   ```

5. **Add end-to-end scenario tests** in `tests/`:
   - Test Hindi input → Kannada letter generated
   - Test mic permission denied → error shown correctly
   - Test PDF download returns valid PDF bytes

6. Commit and push:
   ```bash
   git add frontend/src/components/DemoPresets.tsx tests/
   git commit -m "feat(M8): wire demo presets + add e2e scenario tests"
   git push origin task-8-qa
   ```

### Files to touch
- `frontend/src/components/DemoPresets.tsx` – wire to backend
- `tests/` – add new test cases

---

## 🔗 Integration Checklist (M1 runs before demo)

```
[ ] M4 STT branch merged → /api/transcribe returns real transcript
[ ] M5 Backend branch merged → /api/process-voice and /api/demo-preset live
[ ] M8 QA branch merged → DemoPresets wired + tests pass
[ ] .env filled in on demo machine (WATSONX_API_KEY, OPENAI_API_KEY)
[ ] backend/ running: uvicorn main:app --reload on port 8000
[ ] frontend/ running: npm run dev on port 3000
[ ] Voice flow tested: Speak → Transcript → Kannada letter → PDF download
[ ] Demo preset tested: Click BESCOM button → letter appears → Play audio
[ ] Mobile view verified at 375px width
```

---

> 💡 **Tip for all members:** Run `git pull origin main` before starting your work to get the latest integrated code.
> Questions? Tag @M1-Vinay on the team chat.
