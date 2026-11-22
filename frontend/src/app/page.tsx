"use client";

/**
 * SahayaVoice – Root Page
 * Owner: Member 2 (Frontend Developer)
 *
 * Orchestrates: language → voice/typed input → STT → LLM (clarify loop) → letter.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Building2, Droplets, FileSignature, Landmark, Mic2, Sparkles, Zap } from "lucide-react";
import AuroraBackground from "@/components/AuroraBackground";
import ConversationThread from "@/components/ConversationThread";
import DemoPresets from "@/components/DemoPresets";
import Header from "@/components/Header";
import HistoryDrawer from "@/components/HistoryDrawer";
import KannadaDocCard from "@/components/KannadaDocCard";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PipelineStepper from "@/components/PipelineStepper";
import TextComposer from "@/components/TextComposer";
import ToastProvider, { useToast } from "@/components/Toaster";
import VoiceRecorder from "@/components/VoiceRecorder";
import { processVoice, speak, uid } from "@/lib/api";
import { SUPPORTED_LANGUAGES, type HistoryItem, type LanguageCode, type Stage, type Turn, type VoiceResult } from "@/lib/types";

export type { VoiceResult } from "@/lib/types";

const HISTORY_KEY = "sv-history";
const ease = [0.22, 1, 0.36, 1] as const;

const HOW = [
  { icon: Mic2, title: "Speak naturally", body: "Hindi, Tamil, Telugu, English or Kanglish — however you talk." },
  { icon: Sparkles, title: "We ask what's missing", body: "Ward, account number, dates — follow-ups come back in your language." },
  { icon: FileSignature, title: "Get a formal letter", body: "Official Kannada complaint, ready to print, share or submit." },
];

const DEPTS = [
  { icon: Zap, name: "BESCOM" },
  { icon: Droplets, name: "BWSSB" },
  { icon: Building2, name: "BBMP" },
  { icon: Landmark, name: "Rental disputes" },
];

function isLang(code: string | undefined): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

function App() {
  const toast = useToast();
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [stage, setStage] = useState<Stage>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const sessionRef = useRef(uid());
  const resultRef = useRef<HTMLDivElement>(null);
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);

  const busy = stage === "listening" || stage === "transcribing" || stage === "understanding" || stage === "drafting";
  const awaitingAnswer = turns.length > 0 && turns[turns.length - 1].kind === "clarify";

  // Load persisted prefs + history
  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
      const l = localStorage.getItem("sv-lang");
      if (isLang(l ?? undefined)) setLanguage(l as LanguageCode);
      if (localStorage.getItem("sv-voice") === "0") setVoiceReplies(false);
    } catch {
      /* storage blocked */
    }
  }, []);

  const persist = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage blocked */
    }
  };

  const showError = useCallback(
    (message: string) => {
      setStage((s) => (s === "listening" ? s : "error"));
      toast({ tone: "error", title: "Something went wrong", description: message });
    },
    [toast],
  );

  const speakReply = useCallback(
    async (text: string, lang: string) => {
      if (!voiceReplies) return;
      try {
        replyAudioRef.current?.pause();
        const url = URL.createObjectURL(await speak(text, lang));
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        replyAudioRef.current = audio;
        await audio.play();
      } catch {
        /* spoken reply is a nice-to-have */
      }
    },
    [voiceReplies],
  );

  /** Shared by voice and typed input. */
  const handleTranscript = useCallback(
    async (transcript: string, detected?: string) => {
      const lang: LanguageCode = isLang(detected) ? detected : language;
      const userTurn: Turn = { id: uid(), role: "user", text: transcript };
      const context = turns.map((t) => ({ role: t.role, content: t.text }));
      setTurns((prev) => [...prev, userTurn]);
      setStage("understanding");

      const draftTimer = setTimeout(() => setStage((s) => (s === "understanding" ? "drafting" : s)), 1400);
      try {
        const data = await processVoice({ transcript, language: lang, session_id: sessionRef.current, context });
        clearTimeout(draftTimer);
        const full: VoiceResult = {
          transcript: [...turns, userTurn].filter((t) => t.role === "user").map((t) => t.text).join(" "),
          language: lang,
          kannada_letter: data.kannada_letter ?? "",
          summary: data.summary ?? "",
          next_steps: data.next_steps ?? "",
          clarify_question: data.clarify_question,
          intent: data.intent,
          action: data.action ?? "generate",
        };

        if (full.action === "clarify" && full.clarify_question) {
          setTurns((prev) => [...prev, { id: uid(), role: "assistant", text: full.clarify_question!, kind: "clarify" }]);
          setStage("idle");
          speakReply(full.clarify_question, lang);
        } else {
          setTurns((prev) => [...prev, { id: uid(), role: "assistant", text: "Your formal Kannada letter is ready below.", kind: "letter" }]);
          showResult(full);
          if (full.summary) speakReply(full.summary, lang);
        }
      } catch (err) {
        clearTimeout(draftTimer);
        showError(err instanceof Error ? err.message : "Processing failed");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, turns, speakReply, showError],
  );

  const showResult = (r: VoiceResult) => {
    setResult(r);
    setStage("done");
    setTimeout(() => setStage((s) => (s === "done" ? "idle" : s)), 1600);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    if (r.kannada_letter) {
      const item: HistoryItem = {
        id: uid(),
        createdAt: Date.now(),
        title: r.summary || r.transcript || "Complaint letter",
        result: r,
      };
      setHistory((prev) => {
        const next = [item, ...prev].slice(0, 20);
        persist(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
    }
  };

  const handlePreset = (r: VoiceResult) => {
    setTurns([
      { id: uid(), role: "user", text: r.transcript },
      { id: uid(), role: "assistant", text: "Your formal Kannada letter is ready below.", kind: "letter" },
    ]);
    showResult(r);
    toast({ tone: "success", title: "Demo letter generated" });
  };

  const reset = () => {
    replyAudioRef.current?.pause();
    sessionRef.current = uid();
    setTurns([]);
    setResult(null);
    setStage("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div id="top" className="relative min-h-screen overflow-x-hidden">
      <AuroraBackground />

      <div className="relative z-10 px-4 pb-24 pt-3 sm:px-6">
        <Header
          voiceReplies={voiceReplies}
          onToggleVoiceReplies={() =>
            setVoiceReplies((v) => {
              persist("sv-voice", v ? "0" : "1");
              toast({ tone: "info", title: v ? "Spoken replies off" : "Spoken replies on" });
              return !v;
            })
          }
          historyCount={history.length}
          onOpenHistory={() => setHistoryOpen(true)}
        />

        {/* Hero */}
        <section className="mx-auto mt-12 flex max-w-3xl flex-col items-center text-center sm:mt-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="glass mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Bengaluru civic help, in your language
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease, delay: 0.1 }}
            className="font-display text-[44px] leading-[1.02] tracking-tight sm:text-7xl"
          >
            Say it your way.
            <br />
            <em className="text-gradient">File it in Kannada.</em>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.25 }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base"
          >
            Describe your BESCOM, BWSSB, BBMP or rental problem out loud. SahayaVoice turns it into a formal Kannada complaint letter — and reads it back to you.
          </motion.p>
        </section>

        {/* Studio */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.35 }}
          className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-6"
        >
          <LanguageSwitcher
            value={language}
            disabled={busy}
            onChange={(l) => {
              setLanguage(l);
              persist("sv-lang", l);
            }}
          />

          <VoiceRecorder
            language={language}
            stage={stage}
            busy={busy}
            onStageChange={setStage}
            onTranscript={handleTranscript}
            onError={showError}
          />

          <PipelineStepper stage={stage} />

          <ConversationThread turns={turns} thinking={stage === "understanding" || stage === "drafting"} onReset={reset} />

          <TextComposer
            disabled={busy}
            onSubmit={(t) => handleTranscript(t)}
            placeholder={awaitingAnswer ? "Type your answer…" : undefined}
          />
        </motion.section>

        {/* Result */}
        <div ref={resultRef} className="mt-14 scroll-mt-24">
          <AnimatePresence mode="wait">{result?.kannada_letter && <KannadaDocCard key={result.kannada_letter} result={result} />}</AnimatePresence>
        </div>

        {/* Demo presets */}
        <div className="mt-16">
          <DemoPresets language={language} onPresetSelected={handlePreset} onError={showError} disabled={busy} />
        </div>

        {/* How it works */}
        <section className="mx-auto mt-20 max-w-5xl" aria-labelledby="how-heading">
          <p className="eyebrow text-center">How it works</p>
          <h2 id="how-heading" className="mt-2 text-center font-display text-3xl sm:text-4xl">
            From a voice note to an <em className="text-gradient">official letter</em>
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {HOW.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.6, ease }}
                className="glass relative overflow-hidden rounded-2xl p-5"
              >
                <span className="absolute right-4 top-3 font-display text-5xl italic text-ink/[0.06]">0{i + 1}</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
                  <s.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {DEPTS.map((d) => (
              <span key={d.name} className="inline-flex items-center gap-1.5 rounded-full border hairline px-3 py-1.5 text-xs text-muted">
                <d.icon className="h-3.5 w-3.5" /> {d.name}
              </span>
            ))}
          </div>
        </section>

        <footer className="mx-auto mt-20 max-w-5xl border-t hairline pt-6 text-center text-xs text-muted">
          SahayaVoice · Bengaluru Bobathon · Letters are drafts — review before submitting.
        </footer>
      </div>

      <HistoryDrawer
        open={historyOpen}
        items={history}
        onClose={() => setHistoryOpen(false)}
        onSelect={(item) => {
          setHistoryOpen(false);
          setResult(item.result);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
        }}
        onClear={() => {
          setHistory([]);
          persist(HISTORY_KEY, "[]");
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <App />
      </ToastProvider>
    </MotionConfig>
  );
}
