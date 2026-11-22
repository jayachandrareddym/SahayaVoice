"use client";

/**
 * SahayaVoice – KannadaDocCard Component
 * Owner: Member 7 (TTS & Document Output)
 *
 * Responsibilities:
 *   - Display split-view card:
 *       Top:    user's transcript + AI conversational response / clarification
 *       Bottom: official Kannada complaint letter
 *   - "▶ Play" button  → POST /api/speak, play returned MP3 via Web Audio
 *   - "Copy Text" button → copies the Kannada letter to clipboard + shows toast
 *   - "Download PDF" button → POST /api/download-pdf, trigger browser download
 *   - Show English/Hindi verification summary below the Kannada letter
 */

import { useRef, useState } from "react";
import { VoiceResult } from "@/app/page";

interface KannadaDocCardProps {
  result: VoiceResult;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export default function KannadaDocCard({ result }: KannadaDocCardProps) {
  const [copyToast, setCopyToast]     = useState(false);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [playError, setPlayError]     = useState("");
  const [pdfLoading, setPdfLoading]   = useState(false);
  const [pdfError, setPdfError]       = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Copy Text ──────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.kannada_letter);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = result.kannada_letter;
      ta.style.position = "fixed";
      ta.style.opacity  = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    }
  };

  // ── Download PDF ───────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    setPdfError("");
    setPdfLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/download-pdf`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          kannada_letter: result.kannada_letter,
          summary:        result.summary ?? "",
          language:       result.language,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "sahayavoice_complaint.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF download failed";
      setPdfError(msg);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Play Audio (TTS) ───────────────────────────────────────────────────────
  const handlePlayAudio = async () => {
    setPlayError("");

    // If already playing, stop
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/speak`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          text:     result.summary || result.transcript,
          language: result.language,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? `HTTP ${res.status}`);
      }

      const { audio_base64, mime_type } = await res.json() as {
        audio_base64: string;
        mime_type: string;
      };

      // Decode base64 → Blob → Object URL → HTMLAudioElement
      const binary   = atob(audio_base64);
      const bytes    = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob     = new Blob([bytes], { type: mime_type });
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setPlayError("Audio playback failed.");
        audioRef.current = null;
      };
      await audio.play();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Audio playback failed";
      setPlayError(msg);
      setIsPlaying(false);
    }
  };

  return (
    <article
      className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      aria-label="SahayaVoice result card"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Top half – transcript & AI response / clarification                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Your Transcript
        </h2>
        <p className="text-sm text-gray-800 leading-relaxed">{result.transcript}</p>

        {result.action === "clarify" && result.clarify_question && (
          <div className="mt-3 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700 border border-indigo-100">
            <strong>SahayaVoice asks:</strong> {result.clarify_question}
          </div>
        )}

        {result.summary && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Summary ({result.language.toUpperCase()})
            </h3>
            <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3 border border-green-100">
              {result.summary}
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom half – official Kannada letter + actions                      */}
      {/* ------------------------------------------------------------------ */}
      {result.action === "generate" && result.kannada_letter && (
        <div className="p-5">

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Official Kannada Complaint Letter
            </h2>

            <div className="flex flex-wrap gap-2">
              {/* Play / Stop audio */}
              <button
                onClick={handlePlayAudio}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  isPlaying
                    ? "border-red-300 text-red-600 bg-red-50 hover:bg-red-100"
                    : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                }`}
                aria-label={isPlaying ? "Stop audio" : "Play voice confirmation"}
              >
                {isPlaying ? "⏹ Stop" : "▶ Play"}
              </button>

              {/* Copy text + toast */}
              <div className="relative">
                <button
                  onClick={handleCopy}
                  className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Copy Kannada letter to clipboard"
                >
                  {copyToast ? "✓ Copied!" : "Copy Text"}
                </button>
                {copyToast && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    Copied to clipboard
                  </span>
                )}
              </div>

              {/* Download PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className={`text-xs px-3 py-1 rounded-full text-white transition-colors ${
                  pdfLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
                aria-label="Download complaint as PDF"
              >
                {pdfLoading ? "⏳ Generating…" : "⬇ Download PDF"}
              </button>
            </div>
          </div>

          {/* Error banners */}
          {playError && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1 mb-2">
              Audio error: {playError}
            </p>
          )}
          {pdfError && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1 mb-2">
              PDF error: {pdfError}
            </p>
          )}

          {/* Kannada letter body */}
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
            {result.kannada_letter}
          </pre>

          {/* Next steps */}
          {result.next_steps && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-800 border border-green-100">
              <strong>Next Steps:</strong> {result.next_steps}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
