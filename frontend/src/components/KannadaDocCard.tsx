"use client";

/**
 * SahayaVoice – KannadaDocCard Component
 * Owner: Member 7 (TTS & Document Output)
 * Scaffold by: Member 1 (Task 1)
 *
 * Responsibilities (M7):
 *   - Display split-view card:
 *       Left/Top:  user's transcript + AI conversational response / clarification
 *       Right/Bottom: official Kannada complaint letter
 *   - "Copy Text" button copies the Kannada letter to clipboard
 *   - "Download PDF" button generates and downloads a PDF via reportlab (backend)
 *   - Play audio confirmation via /api/speak (TTS)
 *   - Show English/Hindi verification summary below the Kannada letter
 */

import { VoiceResult } from "@/app/page";

interface KannadaDocCardProps {
  result: VoiceResult;
}

export default function KannadaDocCard({ result }: KannadaDocCardProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.kannada_letter);
    /* TODO (M7): show a brief toast / confirmation message */
  };

  const handleDownloadPdf = async () => {
    /**
     * TODO (M7):
     *   POST /api/download-pdf with { kannada_letter, summary }
     *   Receive a PDF blob and trigger browser download.
     */
    console.warn("KannadaDocCard: PDF download not yet implemented (M7)");
  };

  const handlePlayAudio = async () => {
    /**
     * TODO (M7):
     *   POST /api/speak with { text: result.summary, language: result.language }
     *   Play the returned audio stream.
     */
    console.warn("KannadaDocCard: audio playback not yet implemented (M7)");
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
                Copy Text
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
        </div>
      )}
    </article>
  );
}
