# 🚀 SahayaVoice – Premium UI Upgrade Guide

> **For all team members** — the frontend has been fully redesigned as a premium AI SaaS platform.
> Read this doc to understand what changed, what still needs work per member, and how to build on top of it.

---

## 🎨 What Changed (Already Done by IBM Bob)

### Design System
| File | What was added |
|------|---------------|
| `frontend/src/app/globals.css` | Deep navy/indigo/violet palette, glassmorphism CSS classes (`.glass`, `.glass-dark`), gradient text (`.text-gradient`), brand buttons (`.btn-brand`, `.btn-ghost`), orb ring animations, Inter font from Google |
| `frontend/tailwind.config.js` | Brand color tokens, `float`/`glow`/`wave` keyframe animations, `shadow-glass`, `shadow-brand` tokens |

### New Components
| Component | Description |
|-----------|-------------|
| `Header.tsx` | Fixed glassmorphism navigation bar, mobile slide-out drawer, scroll-aware transparency |
| `HeroSection.tsx` | Animated hero with gradient mesh background, floating orbs, language badges, trust indicators |
| `VoiceOrb.tsx` | Premium animated microphone orb — 4 states (idle/recording/processing/error), pulsing rings, live Web Audio waveform, auto-stop at 120s, Safari fallback |
| `LanguageSelector.tsx` | Dropdown with native script labels (ಕನ್ನಡ, हिन्दी, தமிழ், etc.), animated open/close |
| `InfoSections.tsx` | 5-step "How It Works" + 8-card Features section with scroll-triggered animations |

### Upgraded Components
| Component | What changed |
|-----------|-------------|
| `KannadaDocCard.tsx` | Two-panel glassmorphism layout, gradient action buttons, animated copy toast, error banners |
| `DemoPresets.tsx` | Animated scenario cards with icons, hover lift effect, loading states |
| `page.tsx` | Full premium single-page app — hero + voice orb + result + how-it-works + features + demo + footer |

### Dependencies Added
```bash
framer-motion   # Page transitions, hover animations, AnimatePresence
lucide-react    # Professional icon set (Mic, FileText, Download, etc.)
```

---

## 🏗 New Page Structure

```
page.tsx (premium landing page)
├── <Header />           ← Fixed nav (scroll-aware)
├── <HeroSection />      ← Animated hero with CTAs
├── Voice Assistant      ← Language selector + VoiceOrb in glass card
├── Result Section       ← KannadaDocCard (shows after voice/demo)
├── <InfoSections />     ← How It Works (5 steps) + Features (8 cards)
├── <DemoPresets />      ← 3 animated scenario cards
└── Footer               ← Brand + multilingual tagline
```

---

## 📋 What Each Member Still Needs to Do

---

### M2 – Frontend Developer
**Branch:** `task-2-frontend`
**Your job:** Polish and extend the premium UI

#### Tasks
- [ ] **Review the new components** — pull main, run `npm run dev`, verify all sections display correctly
- [ ] **Test mobile responsiveness** at 375px, 390px, 768px
  - Open Chrome DevTools → Responsive mode
  - Fix any overflow issues or cramped layouts
- [ ] **Add scroll-triggered section entry animations** to the How It Works steps (they already have `whileInView` — test they trigger correctly on scroll)
- [ ] **Improve the Hero waveform** — add a decorative static waveform SVG illustration below the headline for visual richness
- [ ] **Add a "Back to top" button** that appears after scrolling 300px

#### How to run
```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

---

### M3 – Audio Engineer
**Branch:** `task-3-voice-recorder`
**Your job:** The new `VoiceOrb.tsx` replaces `VoiceRecorder.tsx` for the UI. `VoiceRecorder.tsx` is kept for reference.

#### Tasks
- [ ] **Test VoiceOrb on mobile Chrome** (Android) — verify mic permission dialog appears
- [ ] **Test VoiceOrb on Safari iOS** — the `audio/mp4` MIME fallback is in place, verify it works
- [ ] **Verify waveform** draws correctly on canvas when recording — should show indigo/violet gradient wave
- [ ] **Test auto-stop** — record for 2 minutes, verify it stops automatically
- [ ] **Notify M1** if any recording issues are found — the orb is in `frontend/src/components/VoiceOrb.tsx`

---

### M4 – STT Engineer ← 🔴 CRITICAL
**Branch:** `task-4-stt`
**Your job:** The backend STT is what makes real voice recording work. Without it, only demo presets work.

#### Tasks
- [ ] **Implement `transcribe()` in `backend/pipeline/stt.py`** — full instructions in `MEMBER_TASKS.md`
- [ ] The `VoiceOrb` POSTs audio to `/api/transcribe` → your implementation must return `{"transcript": "...", "language": "..."}`
- [ ] Test with actual mic recording from the new premium UI
- [ ] Commit to `task-4-stt` branch and notify M1 to merge

---

### M5 – Backend Developer
**Branch:** `task-5-backend`
**Status:** `/api/process-voice` and `/api/demo-preset` already wired ✅

#### Remaining Tasks
- [ ] **Test `/api/process-voice`** with real watsonx credentials — the new UI calls this after transcription
- [ ] **Improve demo preset Kannada letters** — open `backend/main.py`, find `_DEMO_PRESETS`, and add richer formal Kannada content
- [ ] **Add CORS origin** for production domain when known

---

### M6 – AI Agent
**Branch:** `feature/member-6-ai-agent`
**Status:** Agent, intent, clarification, letter generation all done ✅

#### Remaining Tasks
- [ ] **Run with real WATSONX_API_KEY** — end-to-end test the full flow through the new UI
- [ ] **Test clarification loop** — speak incomplete complaint → verify AI asks follow-up → new UI shows the question in the indigo box
- [ ] Add more complaint categories to `schema.py` if needed (e.g. BBMP garbage, street lights)

---

### M7 – TTS & PDF ← 🟡 IMPORTANT
**Branch:** `task-7-tts-pdf`
**Status:** TTS and PDF working ✅

#### Remaining Tasks
- [ ] **Add Noto Sans Kannada font** — this is the #1 PDF quality issue
  ```bash
  mkdir backend/fonts
  # Download from: https://fonts.google.com/noto/specimen/Noto+Sans+Kannada
  # Place as: backend/fonts/NotoSansKannada-Regular.ttf
  ```
- [ ] **Test PDF download** from the new `KannadaDocCard` — click the indigo "PDF" button
- [ ] **Test TTS play** — click "▶ Play" in the new card — should play audio of the summary

---

### M8 – QA & Demo ← 🔴 CRITICAL FOR JUDGING
**Branch:** `task-8-qa`
**Your job:** The new UI is built. You need to test everything and polish the demo scenarios.

#### Tasks

**1. Test all three demo scenarios in the new UI:**
```bash
# Start both servers (see SETUP_AND_RUN.md)
# Go to http://localhost:3000
# Scroll to "Try a Demo Scenario"
# Click each card — verify Kannada letter appears with full two-panel view
```

**2. Improve the Kannada demo letters** — open `backend/main.py`, find `_DEMO_PRESETS`:
```python
# Replace stub letters with more complete formal letters
# Each letter should have: salutation, subject, body, complainant signature
```

**3. Run the full test suite:**
```bash
cd backend
.venv\Scripts\activate   # Windows
source .venv/bin/activate  # Mac/Linux
python -m pytest tests/test_sahaya.py -v
```
Expected: **15 tests passing ✅**

**4. Test on mobile** (375px viewport):
- Open Chrome DevTools
- Select iPhone SE viewport
- Test: hero loads → language selector works → orb taps → demo cards scroll → result card readable

**5. Test PDF download:**
- Click any demo card
- When result appears, click "⬇ PDF" button
- Verify PDF downloads and Kannada text shows (may show squares if no font yet — tell M7)

**6. Document any bugs** in a GitHub issue or team chat.

---

## 🎯 Demo Day Checklist (M1 runs before judges)

```
[ ] git pull origin main on demo machine
[ ] cd backend && .venv\Scripts\activate && uvicorn main:app --reload
[ ] cd frontend && npm run dev
[ ] Open http://localhost:3000
[ ] Verify hero section loads with animations
[ ] Click BESCOM demo card → letter appears in two-panel view
[ ] Click ▶ Play → audio plays (needs SARVAM_API_KEY or edge-tts)
[ ] Click ⬇ PDF → complaint downloads
[ ] Switch language to ಕನ್ನಡ → verify selector updates
[ ] Tap voice orb (needs OPENAI_API_KEY for STT)
[ ] Scroll through How It Works → animations trigger
[ ] Verify mobile layout at 375px
```

---

## 🌐 UI Component Map

```
http://localhost:3000
│
├── Header                    Fixed top nav, Start Speaking button
├── Hero (#hero)              "Your Voice. Your Language. Your Rights."
│   ├── Language badges       ಕನ್ನಡ · हिन्दी · தமிழ் · తెలుగు · English
│   └── CTA buttons           Start Speaking → Voice Assistant section
│
├── Voice Assistant           Glass card with LanguageSelector + VoiceOrb
│   ├── Idle state            Glowing indigo orb, "Tap the orb to speak"
│   ├── Recording state       Pulsing rings, live waveform, red stop button
│   ├── Processing state      Rotating loader, "Understanding with IBM Granite…"
│   └── Error state           Red alert with retry button
│
├── Result (#result-section)  Appears after voice or demo preset
│   ├── LEFT panel            Transcript, language, summary, next steps
│   └── RIGHT panel           Kannada letter, Play/Copy/PDF buttons
│
├── How It Works (#how-it-works)   5 animated steps with connecting line
├── Features (#features)           8 feature cards with hover effects
│
└── Demo (#demo)              3 scenario cards (BESCOM/BWSSB/Rental)
    └── On click              → calls /api/demo-preset → shows result
```

---

## 🔧 Key Styling Classes

| Class | Usage |
|-------|-------|
| `.glass` | Frosted glass card (lighter) |
| `.glass-dark` | Deep glass card (navy tinted) |
| `.text-gradient` | Indigo→violet→purple gradient text |
| `.btn-brand` | Gradient indigo→violet pill button |
| `.btn-ghost` | Transparent border pill button |
| `.bg-mesh` | Animated gradient mesh background |
| `.orb-ring` | Pulsing ring animation for recording state |

---

## 📦 Adding New Components

If you need to add a new component, follow this pattern:

```tsx
"use client";
import { motion } from "framer-motion";

export default function MyComponent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-dark rounded-2xl border border-white/10 p-6"
    >
      {/* your content */}
    </motion.div>
  );
}
```

---

> 💡 **Questions?** Tag @M1-Vinay on team chat.
> 📋 **Detailed per-member backend tasks** → see `MEMBER_TASKS.md`
> 🚀 **Setup instructions** → see `SETUP_AND_RUN.md`
