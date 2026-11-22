"use client";

/**
 * SahayaVoice – DemoPresets Component
 * Owner: Member 8 (QA, Demo & Documentation)
 *
 * Provides 3 one-click demo scenarios for the hackathon judging session.
 * Each preset fires POST /api/demo-preset which returns a pre-filled VoiceResult.
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function DemoPresets({
  language,
  onPresetSelected,
  disabled = false,
}: DemoPresetsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreset = async (presetId: string) => {
    setLoading(presetId);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/demo-preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: presetId, language }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: VoiceResult = await res.json();
      onPresetSelected(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load demo: ${msg}`);
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
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </section>
  );
}
