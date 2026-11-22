"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import Header          from "@/components/Header";
import HeroSection     from "@/components/HeroSection";
import VoiceOrb        from "@/components/VoiceOrb";
import DemoPresets     from "@/components/DemoPresets";
import KannadaDocCard  from "@/components/KannadaDocCard";
import InfoSections    from "@/components/InfoSections";
import LanguageSelector from "@/components/LanguageSelector";

export type LanguageCode = "kn" | "hi" | "ta" | "te" | "en";

export interface VoiceResult {
  transcript:       string;
  language:         LanguageCode;
  kannada_letter:   string;
  summary:          string;
  next_steps:       string;
  clarify_question?: string;
  action:           "clarify" | "generate";
}

export default function Home() {
  const [language,     setLanguage]     = useState<LanguageCode>("en");
  const [result,       setResult]       = useState<VoiceResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVoiceResult = (data: VoiceResult) => {
    setResult(data);
    setIsProcessing(false);
    // Smooth-scroll to result
    setTimeout(() => document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  return (
    <div className="min-h-screen bg-mesh text-white">
      {/* Fixed navigation */}
      <Header />

      {/* Hero */}
      <HeroSection />

      {/* ── VOICE ASSISTANT SECTION ─────────────────────────────────────── */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Section background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">Voice Assistant</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Speak your complaint
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Select your language, tap the orb, and describe your issue in your own words.
            </p>
          </motion.div>

          {/* Language selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <LanguageSelector value={language} onChange={setLanguage} />
          </motion.div>

          {/* Voice Orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-dark rounded-3xl border border-white/10 p-8 flex flex-col items-center gap-6"
          >
            <VoiceOrb
              language={language}
              onResult={handleVoiceResult}
              onProcessingChange={setIsProcessing}
            />
          </motion.div>
        </div>
      </section>

      {/* ── RESULT ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <section id="result-section" className="px-4 pb-16">
            <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-1">Result Ready</p>
                <h3 className="text-xl font-bold text-white">Your Kannada Complaint Letter</h3>
              </motion.div>
              <KannadaDocCard result={result} />
              <button
                onClick={() => setResult(null)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-2"
              >
                ✕ Clear and start over
              </button>
            </div>
          </section>
        )}
      </AnimatePresence>

      {/* ── HOW IT WORKS + FEATURES ─────────────────────────────────────── */}
      <div className="flex flex-col items-center px-4">
        <InfoSections />
      </div>

      {/* ── DEMO PRESETS ────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-4 pb-16">
        <DemoPresets
          language={language}
          onPresetSelected={handleVoiceResult}
          disabled={isProcessing}
        />
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎙</span>
            <span className="font-bold text-white">SahayaVoice</span>
            <span className="text-slate-500 text-sm">· IBM Bobathon 2026 · Voice AI Track</span>
          </div>
          <div className="text-center text-sm text-slate-500">
            <p className="text-gradient font-medium">ಸಹಾಯ ವಾಯ್ಸ್ · सहाय वॉइस · Built for Bengaluru</p>
          </div>
          <p className="text-xs text-slate-600">Powered by IBM watsonx.ai · Granite</p>
        </div>
      </footer>
    </div>
  );
}
