"use client";

/**
 * SahayaVoice – KannadaDocCard Component
 * Owner: Member 7 (TTS & Document Output)
 *
 * - Split-view card: transcript + Kannada letter
 * - "Copy Text" copies the letter to clipboard
 * - "Download PDF" calls /api/download-pdf and triggers browser download
 * - "▶ Play" calls /api/speak and plays audio confirmation
 */

import { useState } from "react";
import { VoiceResult } from "@/app/page";

interface KannadaDocCardProps {
  result: VoiceResult;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function KannadaDocCard({ result }: KannadaDocCardProps) {
  const [copied, setCopied] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.kannada_letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    setPdfError(null);
    try {
      const res = await fetch(`${API_URL}/api/download-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kannada_letter: result.kannada_letter,
          summary: result.summary ?? "",
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sahayavoice_complaint.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handlePlayAudio = async () => {
    setAudioError(null);
    try {
      const text = result.summary || result.kannada_letter;
      const language = result.language || "en";
      const res = await fetch(`${API_URL}/api/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) throw new Error(`TTS error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Playback failed");
    }
  };

  return (
    <article className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Top half – transcript & AI response                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Your Transcript
        </h2>
        <p className="text-sm text-gray-800 leading-relaxed">{result.transcript}</p>

        {result.action === "clarify" && result.clarify_question && (
          <div className="mt-3 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
            <strong>SahayaVoice asks:</strong> {result.clarify_question}
          </div>
        )}

        {result.summary && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Summary ({result.language.toUpperCase()})
            </h3>
            <p className="text-sm text-gray-700">{result.summary}</p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom half – official Kannada letter                                */}
      {/* ------------------------------------------------------------------ */}
      {result.action === "generate" && result.kannada_letter && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase">
              Official Kannada Complaint Letter
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePlayAudio}
                className="text-xs px-3 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                ▶ Play
              </button>
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {copied ? "✓ Copied!" : "Copy Text"}
              </button>
              <button
                onClick={handleDownloadPdf}
                className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Download PDF
              </button>
            </div>
          </div>

          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
            {result.kannada_letter}
          </pre>

          {result.next_steps && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-800">
              <strong>Next Steps:</strong> {result.next_steps}
            </div>
          )}

          {pdfError && (
            <p className="mt-2 text-xs text-red-500">PDF error: {pdfError}</p>
          )}
          {audioError && (
            <p className="mt-2 text-xs text-red-500">Audio error: {audioError}</p>
          )}
        </div>
      )}
    </article>
  );
}
