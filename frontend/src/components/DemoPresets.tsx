"use client";

/**
 * SahayaVoice – DemoPresets Component
 * Owner: Member 8 (QA, Demo & Documentation)
 * Scaffold by: Member 1 (Task 1)
 *
 * Provides 3 one-click demo scenarios for the hackathon judging session.
 * Each preset fires a POST /api/demo-preset with a scenario ID, which
 * returns a pre-filled VoiceResult – no live microphone needed.
 */

import { useState } from "react";
import { VoiceResult } from "@/app/page";

interface DemoPresetsProps {
  language: string;
  onPresetSelected: (result: VoiceResult) => void;
  disabled?: boolean;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

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
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string>("");

  const handlePreset = async (presetId: string) => {
    setError("");
    setLoading(presetId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/demo-preset`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ preset_id: presetId, language }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? `HTTP ${res.status}`);
      }
      const result = await res.json() as VoiceResult;
      onPresetSelected(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Demo preset failed";
      setError(msg);
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
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePreset(preset.id)}
            disabled={disabled || loading !== null}
            title={preset.description}
            className="
              px-4 py-2 rounded-full border border-gray-300 bg-white text-sm text-gray-700
              hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {loading === preset.id ? "⏳ Loading…" : preset.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1">
          Demo error: {error}
        </p>
      )}
    </section>
  );
}
