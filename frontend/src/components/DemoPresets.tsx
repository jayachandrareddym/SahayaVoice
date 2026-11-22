"use client";

/**
 * SahayaVoice – DemoPresets Component
 * Owner: Member 8 (QA, Demo & Documentation)
 * Scaffold by: Member 1 (Task 1)
 *
 * Provides 3 one-click demo scenarios for the hackathon judging session.
 * Each preset fires a POST /api/demo-preset with a scenario ID, which
 * returns a pre-filled VoiceResult — no live microphone needed.
 */

import { VoiceResult } from "@/app/page";

interface DemoPresetsProps {
  language: string;
  onPresetSelected: (result: VoiceResult) => void;
  disabled?: boolean;
}

/** Preset scenario definitions – M8 owns the final scenario text & tuning */
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

export default function DemoPresets({
  language,
  onPresetSelected,
  disabled = false,
}: DemoPresetsProps) {
  const handlePreset = async (presetId: string) => {
    /**
     * TODO (M8 + M5):
     *   POST /api/demo-preset with { preset_id: presetId, language }
     *   Server returns a VoiceResult JSON (pre-generated for demo reliability).
     *   Call onPresetSelected() with the response.
     *
     * For now, log a warning until M5 implements the endpoint.
     */
    console.warn(`DemoPresets: preset "${presetId}" not yet wired to backend (M5/M8)`);
  };

  return (
    <section className="w-full max-w-2xl">
      <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3">
        Demo Scenarios
      </h2>
      <div className="flex flex-wrap gap-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePreset(preset.id)}
            disabled={disabled}
            title={preset.description}
            className="
              px-4 py-2 rounded-full border border-gray-300 bg-white text-sm text-gray-700
              hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
