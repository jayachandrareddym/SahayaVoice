"use client";

/**
 * SahayaVoice – VoiceRecorder Component
 * Owner: Member 3 (Voice Recording & Audio Engineer)
 * Scaffold by: Member 1 (Task 1)
 *
 * Responsibilities (M3):
 *   - Request microphone permission
 *   - Record audio via Web Audio API / MediaRecorder
 *   - Show live waveform animation while recording
 *   - POST audio blob to /api/transcribe (M4/M5)
 *   - Then POST transcript to /api/process-voice (M6)
 *   - Call onResult() with the final VoiceResult
 *   - Handle microphone errors gracefully
 */

import { VoiceResult } from "@/app/page";

interface VoiceRecorderProps {
  language: string;
  onResult: (result: VoiceResult) => void;
  onProcessingChange: (processing: boolean) => void;
}

export default function VoiceRecorder({
  language,
  onResult,
  onProcessingChange,
}: VoiceRecorderProps) {
  /**
   * TODO (M3):
   *  1. Use navigator.mediaDevices.getUserMedia({ audio: true }) to get mic stream.
   *  2. Create a MediaRecorder, collect chunks on 'dataavailable'.
   *  3. On stop, assemble a Blob and POST to /api/transcribe with the language hint.
   *  4. Take the transcript response, POST to /api/process-voice.
   *  5. Call onResult() with the JSON response.
   *  6. Use requestAnimationFrame + AnalyserNode for the waveform visualisation.
   */

  return (
    <section className="flex flex-col items-center gap-6 w-full max-w-sm">
      {/* Pulse "Tap to Speak" button – M3 replaces this with active recording logic */}
      <button
        className="
          w-28 h-28 rounded-full bg-indigo-600 text-white text-sm font-semibold
          shadow-lg hover:bg-indigo-700 active:scale-95 transition-transform
          animate-pulse
        "
        aria-label="Tap to speak"
        onClick={() => {
          /* M3: wire recording start/stop here */
          console.warn("VoiceRecorder: recording not yet implemented (M3)");
        }}
      >
        🎙<br />Tap to<br />Speak
      </button>

      {/* Waveform placeholder – M3 replaces with canvas/SVG waveform */}
      <div
        className="w-full h-10 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-400"
        aria-hidden="true"
      >
        waveform visualisation (M3)
      </div>
    </section>
  );
}
