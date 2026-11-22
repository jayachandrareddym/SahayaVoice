# 🚀 SahayaVoice – Setup & Run Guide

> **For all 8 team members** — follow this guide to run the project locally in under 5 minutes.

---

## ✅ What You Need (Prerequisites)

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | 2.x | `git --version` |

> Windows users: use **PowerShell** or **Git Bash** for all commands below.

---

## 📥 Step 1 — Get the Code

```bash
git clone https://github.com/jayachandrareddym/SahayaVoice.git
cd SahayaVoice
git pull origin main
```

---

## 🔑 Step 2 — Set Up Environment Variables

```bash
# Copy the template
cp .env.example .env     # Mac/Linux
copy .env.example .env   # Windows
```

Open `.env` and fill in your API keys:

```env
OPENAI_API_KEY=sk-...            # For Whisper STT (ask M4 or M1 for key)
WATSONX_API_KEY=...              # IBM watsonx.ai (ask M1 for key)
WATSONX_PROJECT_ID=...           # IBM watsonx project ID
SARVAM_API_KEY=...               # Optional – better Kannada/Hindi quality
```

> **Don't have keys yet?** The app still starts — demo presets work without any API key.
> Voice recording → STT transcription requires `OPENAI_API_KEY`.
> Kannada letter generation requires `WATSONX_API_KEY`.

---

## 🐍 Step 3 — Backend Setup (Python)

```bash
# Go into backend folder
cd backend

# Create virtual environment
python -m venv .venv

# Activate it:
# Windows (PowerShell):
.venv\Scripts\activate
# Mac / Linux:
source .venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Start the API server
uvicorn main:app --reload --port 8000
```

### ✅ You should see:
```
INFO:  Uvicorn running on http://0.0.0.0:8000
INFO:  Application startup complete.
```

### 🧪 Verify backend works:
```bash
# Health check
curl http://localhost:8000/health
# → {"status":"ok","service":"sahayavoice-api"}

# Test a demo preset (no API key needed)
curl -X POST http://localhost:8000/api/demo-preset \
  -H "Content-Type: application/json" \
  -d '{"preset_id":"bescom_whitefield","language":"en"}'
# → {"transcript":"...","kannada_letter":"...","action":"generate"}
```

📖 **Full API docs:** http://localhost:8000/docs

---

## ⚛️ Step 4 — Frontend Setup (Next.js)

> Open a **new terminal** (keep backend running in the first one)

```bash
# Go into frontend folder
cd frontend

# Install Node packages
npm install

# Start the dev server
npm run dev
```

### ✅ You should see:
```
▲ Next.js 14.2.3
- Local: http://localhost:3000
✓ Ready in ~25s
```

🌐 **Open your browser:** http://localhost:3000

---

## 🧪 Step 5 — Run Tests

```bash
cd backend
# Activate venv first (if not already)
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # Mac/Linux

# Run the full test suite
python -m pytest tests/test_sahaya.py -v
```

Expected: **15 tests passing ✅**

---

## ⚡ One-Click Demo (No Microphone Needed)

Once both servers are running, go to **http://localhost:3000** and click any of the demo buttons:

| Button | What it does |
|--------|-------------|
| ⚡ BESCOM Power Issue – Whitefield | Shows power fluctuation complaint letter |
| 💧 BWSSB Water Issue – Jayanagar | Shows water supply complaint letter |
| 🏠 Landlord Deposit Dispute – Koramangala | Shows rental dispute letter |

Each button fetches a pre-built Kannada complaint letter — **no API key needed for demo**.

---

## 🔄 Daily Workflow (For All Team Members)

```bash
# 1. Pull latest code before starting work
git pull origin main

# 2. Create/switch to your branch
git checkout task-X-yourname     # or create: git checkout -b task-X-yourname

# 3. Make your changes

# 4. Commit and push
git add .
git commit -m "feat(MX): describe what you built"
git push origin task-X-yourname

# 5. Tell M1 (Vinay) to review and merge your PR
```

---

## 🌐 API Quick Reference

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/health` | GET | Is server alive? | ✅ |
| `/api/transcribe` | POST | Audio → transcript | 🔴 M4 needed |
| `/api/process-voice` | POST | Transcript → Kannada letter | ✅ |
| `/api/speak` | POST | Text → TTS audio (MP3) | ✅ |
| `/api/download-pdf` | POST | Kannada letter → PDF | ✅ |
| `/api/demo-preset` | POST | Preset ID → VoiceResult | ✅ |

---

## 🛑 Stopping the Servers

```bash
# In each terminal, press:
Ctrl + C
```

---

## ❌ Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` with venv activated |
| `port 8000 already in use` | Run `uvicorn main:app --port 8001` and update `NEXT_PUBLIC_BACKEND_URL=http://localhost:8001` in `.env` |
| `port 3000 already in use` | Next.js will auto-switch to 3001 — check terminal output |
| `CORS error` in browser | Make sure backend is running on port 8000 |
| Kannada text shows squares in PDF | M7 needs to add `NotoSansKannada-Regular.ttf` to `backend/fonts/` |
| `NOT_IMPLEMENTED: M4 pending` | STT not built yet — use demo preset buttons instead |
| `watsonx error` | Check `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` in `.env` |

---

## 📂 Project Structure at a Glance

```
SahayaVoice/
├── backend/          ← Python FastAPI server  → runs on :8000
│   ├── main.py       ← All API endpoints
│   ├── pipeline/     ← STT, TTS, PDF, AI agent
│   ├── .venv/        ← Python virtual environment (don't commit)
│   └── requirements.txt
├── frontend/         ← Next.js React app       → runs on :3000
│   ├── src/app/      ← Pages
│   ├── src/components/ ← VoiceRecorder, KannadaDocCard, DemoPresets
│   └── node_modules/ ← npm packages (don't commit)
├── .env              ← Your API keys (don't commit)
├── MEMBER_TASKS.md   ← What each member needs to do
└── README.md         ← Full project documentation
```

---

## 🔑 Who Owns What

| You are | Your file | Your task |
|---------|-----------|-----------|
| M2 | `frontend/src/app/page.tsx` | Mobile-friendly UI polish |
| M3 | `frontend/src/components/VoiceRecorder.tsx` | Safari MIME fallback |
| M4 | `backend/pipeline/stt.py` | Implement Whisper STT ← **critical** |
| M5 | `backend/main.py` | Endpoints wired ✅ done |
| M6 | `backend/pipeline/sahaya/` | IBM Granite agent ✅ done |
| M7 | `backend/fonts/NotoSansKannada-Regular.ttf` | Add Kannada font ← **needed for PDF** |
| M8 | `frontend/src/components/DemoPresets.tsx` | Wired ✅, improve Kannada content |

---

> 💡 **Questions?** Tag @M1-Vinay on the team chat or open a GitHub issue.
> 📋 For detailed per-member tasks → see **[MEMBER_TASKS.md](./MEMBER_TASKS.md)**
