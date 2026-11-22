"use client";

/**
 * SahayaVoice – Root Page
 * Owner: Member 2 (Frontend Developer)
 * Scaffold by: Member 1 (Task 1)
 *
 * Layout:
 *   - Language selector (top bar)
 *   - VoiceRecorder (centre, prominent "Tap to Speak" pulse button)
 *   - DemoPresets (quick-launch scenario buttons)
 *   - KannadaDocCard (split-view output: transcript + Kannada letter)
 */

import { useState } from "react";
import VoiceRecorder from "@/components/VoiceRecorder";
import KannadaDocCard from "@/components/KannadaDocCard";
import DemoPresets from "@/components/DemoPresets";

/** Languages supported by SahayaVoice */
const SUPPORTED_LANGUAGES = [
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "en", label: "English" },
] as const;

type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export interface VoiceResult {
  transcript: string;
  language: LanguageCode;
  kannada_letter: string;
  summary: string;
  next_steps: string;
  clarify_question?: string;
  action: "clarify" | "generate";
}

export default function Home() {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /** Called by VoiceRecorder or DemoPresets once audio/text is ready */
  const handleVoiceResult = (data: VoiceResult) => {
    setResult(data);
    setIsProcessing(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8 gap-8">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-700">🎙 SahayaVoice</h1>

        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
          aria-label="Select your language"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Voice Recorder (M3 owns the recording logic)                         */}
      {/* ------------------------------------------------------------------ */}
      <VoiceRecorder
        language={language}
        onResult={handleVoiceResult}
        onProcessingChange={setIsProcessing}
      />

      {/* ------------------------------------------------------------------ */}
      {/* One-click demo presets for hackathon judging (M8 owns content)       */}
      {/* ------------------------------------------------------------------ */}
      <DemoPresets
        language={language}
        onPresetSelected={handleVoiceResult}
        disabled={isProcessing}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Output: Kannada letter + transcript (M7 owns PDF download)           */}
      {/* ------------------------------------------------------------------ */}
      {result && <KannadaDocCard result={result} />}
    </main>
  );
}
