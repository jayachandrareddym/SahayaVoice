"use client";

/**
 * SahayaVoice – DemoPresets Component
 * Owner: Member 8 (QA, Demo & Documentation)
 *
 * Provides 3 one-click demo scenarios for the hackathon judging session.
 * Tries POST /api/demo-preset first; falls back to offline data if unavailable.
 */

import { useState } from "react";
import { VoiceResult } from "@/app/page";

interface DemoPresetsProps {
  language: string;
  onPresetSelected: (result: VoiceResult) => void;
  disabled?: boolean;
}

const PRESETS = [
  {
    id: "bescom_whitefield",
    label: "⚡ BESCOM Power Issue – Whitefield",
    description: "Power fluctuation complaint to BESCOM",
  },
  {
    id: "bwssb_jayanagar",
    label: "💧 BWSSB Water Issue – Jayanagar",
    description: "No water supply complaint to BWSSB",
  },
  {
    id: "rental_koramangala",
    label: "🏠 Landlord Deposit Dispute – Koramangala",
    description: "Security deposit non-refund complaint",
  },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

/** Offline fallback data – instant, no network required */
const OFFLINE_DATA: Record<PresetId, Omit<VoiceResult, "language">> = {
  bescom_whitefield: {
    transcript: "Whitefield area lo last 3 days se power fluctuation ho raha hai. Mere ghar ke sare appliances damage ho gaye.",
    action: "generate",
    kannada_letter:
      "ಮಾನ್ಯ ಆಯುಕ್ತರು,\nಬೆಸ್ಕಾಮ್ ವಿದ್ಯುತ್ ಸರಬರಾಜು ಕಂಪನಿ,\nಬೆಂಗಳೂರು.\n\nವಿಷಯ: ವೈಟ್‌ಫೀಲ್ಡ್ ಪ್ರದೇಶದಲ್ಲಿ ವಿದ್ಯುತ್ ವೋಲ್ಟೇಜ್ ಏರಿಳಿತ ಸಮಸ್ಯೆ ಬಗ್ಗೆ ದೂರು.\n\nಮಾನ್ಯರೇ,\nಕಳೆದ 3 ದಿನಗಳಿಂದ ವೈಟ್‌ಫೀಲ್ಡ್ ಪ್ರದೇಶದಲ್ಲಿ ನಿರಂತರ ವಿದ್ಯುತ್ ವೋಲ್ಟೇಜ್ ಏರಿಳಿತ ಸಂಭವಿಸುತ್ತಿದೆ. ಮನೆಯ ವಿದ್ಯುತ್ ಉಪಕರಣಗಳು ಹಾನಿಗೊಳಗಾಗಿವೆ.\n\nದಯವಿಟ್ಟು ಶೀಘ್ರ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ವಿನಂತಿಸುತ್ತೇನೆ.\n\nವಂದನೆಗಳು,\nನಿವಾಸಿ, ವೈಟ್‌ಫೀಲ್ಡ್",
    summary: "Complaint about power voltage fluctuation in Whitefield area for 3 days, causing damage to home appliances.",
    next_steps: "Submit to BESCOM Whitefield division office or call 1912.",
  },
  bwssb_jayanagar: {
    transcript: "Jayanagar 4th block mein pichle do din se paani nahi aa raha. Humein bahut takleef ho rahi hai.",
    action: "generate",
    kannada_letter:
      "ಮಾನ್ಯ ಆಯುಕ್ತರು,\nಬೆಂಗಳೂರು ನೀರು ಸರಬರಾಜು ಮತ್ತು ಒಳಚರಂಡಿ ಮಂಡಳಿ (BWSSB),\nಬೆಂಗಳೂರು.\n\nವಿಷಯ: ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್‌ನಲ್ಲಿ ಕುಡಿಯುವ ನೀರು ಸರಬರಾಜು ಸ್ಥಗಿತ.\n\nಮಾನ್ಯರೇ,\nಕಳೆದ 2 ದಿನಗಳಿಂದ ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್‌ನಲ್ಲಿ ನೀರು ಸರಬರಾಜು ಆಗುತ್ತಿಲ್ಲ. ನಿವಾಸಿಗಳಿಗೆ ತೀವ್ರ ತೊಂದರೆ ಉಂಟಾಗಿದೆ.\n\nದಯವಿಟ್ಟು ಅಗತ್ಯ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ವಿನಂತಿ.\n\nವಂದನೆಗಳು,\nನಿವಾಸಿ, ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್",
    summary: "No water supply in Jayanagar 4th Block for 2 days causing severe hardship to residents.",
    next_steps: "Submit to BWSSB Jayanagar division or call 1916.",
  },
  rental_koramangala: {
    transcript: "My landlord in Koramangala is refusing to return my security deposit of 50,000 rupees even after 3 months of vacating.",
    action: "generate",
    kannada_letter:
      "ಮಾನ್ಯ ನ್ಯಾಯಾಧಿಕಾರಿಗಳಿಗೆ,\nಬಾಡಿಗೆ ನ್ಯಾಯಾಲಯ,\nಬೆಂಗಳೂರು.\n\nವಿಷಯ: ಭದ್ರತಾ ಠೇವಣಿ ವಾಪಸ್ ನೀಡದ ಬಗ್ಗೆ ದೂರು – ಕೋರಮಂಗಲ.\n\nಮಾನ್ಯರೇ,\nನಾನು 3 ತಿಂಗಳ ಹಿಂದೆ ಕೋರಮಂಗಲ ಬಾಡಿಗೆ ಮನೆ ಖಾಲಿ ಮಾಡಿದ್ದೇನೆ. ಮನೆ ಮಾಲೀಕರು ₹50,000 ಭದ್ರತಾ ಠೇವಣಿ ವಾಪಸ್ ನೀಡಲು ನಿರಾಕರಿಸುತ್ತಿದ್ದಾರೆ.\n\nಕರ್ನಾಟಕ ಬಾಡಿಗೆ ನಿಯಂತ್ರಣ ಕಾಯ್ದೆ 2001ರ ಅಡಿಯಲ್ಲಿ ಸೂಕ್ತ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕೆಂದು ವಿನಂತಿ.\n\nವಂದನೆಗಳು,\nಅರ್ಜಿದಾರರು",
    summary: "Landlord in Koramangala refusing to refund ₹50,000 security deposit 3 months after tenant vacated the property.",
    next_steps: "File complaint at Bangalore Rent Court or consult Karnataka Rent Control Act 2001.",
  },
};

export default function DemoPresets({
  language,
  onPresetSelected,
  disabled = false,
}: DemoPresetsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const handlePreset = async (presetId: PresetId) => {
    if (disabled) return;
    setLoading(presetId);
    setError(null);

    try {
      // Try live backend first
      const res = await fetch(`${API_URL}/api/demo-preset`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ preset_id: presetId, language }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json() as VoiceResult;
      onPresetSelected(data);
    } catch {
      // Fallback to offline data so demo never fails during judging
      const base = OFFLINE_DATA[presetId];
      onPresetSelected({ ...base, language: language as VoiceResult["language"] });
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="w-full max-w-2xl">
      <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3">
        Demo Scenarios
      </h2>
      <div className="flex flex-wrap gap-3">
        {PRESETS.map((preset) => {
          const isLoading = loading === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePreset(preset.id)}
              disabled={disabled || loading !== null}
              title={preset.description}
              className={`
                px-4 py-2 rounded-full border text-sm transition-colors
                ${isLoading
                  ? "border-indigo-400 text-indigo-700 bg-indigo-50 cursor-wait"
                  : "border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50"
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {isLoading ? "⏳ Loading…" : preset.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </section>
  );
}
