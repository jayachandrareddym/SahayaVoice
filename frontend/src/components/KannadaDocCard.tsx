"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Download, Play, Square, CheckCircle, FileText, Volume2, ChevronRight } from "lucide-react";
import { VoiceResult } from "@/app/page";

interface KannadaDocCardProps { result: VoiceResult; }

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function KannadaDocCard({ result }: KannadaDocCardProps) {
  const [copied,     setCopied]     = useState(false);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [playErr,    setPlayErr]    = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfErr,     setPdfErr]     = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.kannada_letter);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = result.kannada_letter;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const handlePdf = async () => {
    setPdfErr(""); setPdfLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/download-pdf`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kannada_letter: result.kannada_letter, summary: result.summary ?? "", language: result.language }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.detail ?? `HTTP ${res.status}`); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement("a"), { href: url, download: "sahayavoice_complaint.pdf" });
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { setPdfErr(e instanceof Error ? e.message : "PDF failed"); }
    finally { setPdfLoading(false); }
  };

  const handlePlay = async () => {
    setPlayErr("");
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setIsPlaying(false); return; }
    setIsPlaying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/speak`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.summary || result.transcript, language: result.language }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.detail ?? `HTTP ${res.status}`); }
      const { audio_base64, mime_type } = await res.json() as { audio_base64: string; mime_type: string };
      const bin = atob(audio_base64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([buf], { type: mime_type }));
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setIsPlaying(false); setPlayErr("Audio playback failed."); };
      await audio.play();
    } catch (e) { setPlayErr(e instanceof Error ? e.message : "Playback failed"); setIsPlaying(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-4xl"
    >
      <div className="glass-dark rounded-2xl overflow-hidden shadow-glass">

        {/* Header bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-white text-sm">SahayaVoice Result</span>
          </div>
          <span className="glass px-3 py-1 rounded-full text-xs text-green-400 border border-green-500/30 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Generated
          </span>
        </div>

        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">

          {/* LEFT: Transcript + details */}
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Transcript</p>
              <p className="text-sm text-slate-200 leading-relaxed bg-white/5 rounded-xl p-3">
                {result.transcript}
              </p>
            </div>

            {result.action === "clarify" && result.clarify_question && (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
              >
                <ChevronRight className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-indigo-400 font-semibold mb-0.5">SahayaVoice asks:</p>
                  <p className="text-sm text-slate-200">{result.clarify_question}</p>
                </div>
              </motion.div>
            )}

            {result.summary && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Summary · {result.language.toUpperCase()}
                </p>
                <p className="text-sm text-slate-300 leading-relaxed bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                  {result.summary}
                </p>
              </div>
            )}

            {result.next_steps && (
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-xs text-violet-400 font-semibold mb-1">Next Steps</p>
                <p className="text-sm text-slate-300">{result.next_steps}</p>
              </div>
            )}
          </div>

          {/* RIGHT: Kannada letter */}
          {result.action === "generate" && result.kannada_letter && (
            <div className="p-6 space-y-4">
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Official Kannada Letter</p>
                <div className="flex flex-wrap gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handlePlay}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      isPlaying ? "border-red-500/40 text-red-400 bg-red-500/10" : "border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10"
                    }`}>
                    {isPlaying ? <><Square className="w-3 h-3 fill-current" /> Stop</> : <><Volume2 className="w-3 h-3" /> Play</>}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/20 text-slate-300 hover:bg-white/5 transition-colors">
                    <Copy className="w-3 h-3" /> {copied ? "Copied!" : "Copy"}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handlePdf} disabled={pdfLoading}
                    className="btn-brand flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50">
                    <Download className="w-3 h-3" /> {pdfLoading ? "Generating…" : "PDF"}
                  </motion.button>
                </div>
              </div>

              {/* Error banners */}
              {playErr && <p role="alert" className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{playErr}</p>}
              {pdfErr  && <p role="alert" className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{pdfErr}</p>}

              {/* Letter body */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 max-h-72 overflow-y-auto">
                <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans leading-loose">
                  {result.kannada_letter}
                </pre>
              </div>

              {/* Copy success toast */}
              <AnimatePresence>
                {copied && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-xs text-green-400 glass border border-green-500/20 rounded-full px-3 py-1.5 w-fit"
                  >
                    <CheckCircle className="w-3 h-3" /> Copied to clipboard
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
