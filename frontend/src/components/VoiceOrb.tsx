"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { VoiceResult } from "@/app/page";

interface VoiceOrbProps {
  language: string;
  onResult: (result: VoiceResult) => void;
  onProcessingChange: (processing: boolean) => void;
}

type OrbState = "idle" | "recording" | "processing" | "error";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function VoiceOrb({ language, onResult, onProcessingChange }: VoiceOrbProps) {
  const [state,    setState]    = useState<OrbState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [seconds,  setSeconds]  = useState(0);

  const streamRef        = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const animFrameRef     = useRef<number>(0);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef        = useRef<HTMLCanvasElement>(null);

  // ── Waveform drawing ─────────────────────────────────────────────────
  const drawWaveform = useCallback(() => {
    const canvas   = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0,   "rgba(99,102,241,0.8)");
    grad.addColorStop(0.5, "rgba(167,139,250,1)");
    grad.addColorStop(1,   "rgba(196,181,253,0.8)");
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = grad;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(167,139,250,0.6)";
    ctx.beginPath();
    const sliceW = canvas.width / buf.length;
    let x = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i] / 128;
      const y = (v * canvas.height) / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(99,102,241,0.3)";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }, []);

  useEffect(() => { drawIdle(); return () => cancelAnimationFrame(animFrameRef.current); }, [drawIdle]);

  // ── Start recording ───────────────────────────────────────────────────
  const startRecording = async () => {
    setErrorMsg(""); setSeconds(0);
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setErrorMsg("Microphone permission denied. Please allow mic access."); setState("error"); return; }
    streamRef.current = stream;
    const audioCtx = new AudioContext();
    const source   = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    const mime    = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
                  : MediaRecorder.isTypeSupported("audio/mp4")  ? "audio/mp4" : "audio/ogg";
    const rec     = new MediaRecorder(stream, { mimeType: mime });
    mediaRecorderRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = handleStop;
    rec.start(100);
    setState("recording"); onProcessingChange(false); drawWaveform();
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    // Auto-stop at 120s
    setTimeout(() => { if (mediaRecorderRef.current?.state === "recording") stopRecording(); }, 120_000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close();
    drawIdle(); setState("processing"); onProcessingChange(true);
  };

  const handleStop = async () => {
    const mime = mediaRecorderRef.current?.mimeType ?? "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    try {
      const fd = new FormData();
      fd.append("file", blob, "recording.webm");
      fd.append("language", language);
      const tRes = await fetch(`${BACKEND_URL}/api/transcribe`, { method: "POST", body: fd });
      if (!tRes.ok) throw new Error(`Transcription failed: ${tRes.status}`);
      const { transcript } = await tRes.json() as { transcript: string };
      const pRes = await fetch(`${BACKEND_URL}/api/process-voice`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, language }),
      });
      if (!pRes.ok) throw new Error(`Processing failed: ${pRes.status}`);
      const result = await pRes.json() as VoiceResult;
      onResult(result); setState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error"); setState("error");
    } finally { onProcessingChange(false); }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const isRecording  = state === "recording";
  const isProcessing = state === "processing";

  return (
    <div id="voice-assistant" className="flex flex-col items-center gap-6 w-full" aria-label="Voice assistant">

      {/* ── Orb ── */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing rings (recording only) */}
        {isRecording && (
          <>
            <div className="absolute w-48 h-48 rounded-full border-2 border-indigo-500/40 orb-ring" />
            <div className="absolute w-48 h-48 rounded-full border-2 border-violet-500/30 orb-ring" />
            <div className="absolute w-48 h-48 rounded-full border-2 border-purple-500/20 orb-ring" />
          </>
        )}

        {/* Idle glow */}
        {state === "idle" && (
          <div className="absolute w-40 h-40 rounded-full bg-indigo-600/10 blur-2xl animate-pulse-slow" />
        )}

        {/* Main button */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: isProcessing ? 1 : 1.04 }}
          onClick={() => { if (isRecording) stopRecording(); else if (!isProcessing) startRecording(); }}
          disabled={isProcessing}
          aria-label={isRecording ? "Stop recording" : isProcessing ? "Processing…" : "Tap to speak"}
          className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1 text-white font-semibold shadow-brand-lg transition-all focus:outline-none focus:ring-4 focus:ring-indigo-400/50 ${
            isRecording  ? "bg-gradient-to-br from-red-500 to-rose-600"
          : isProcessing ? "bg-gradient-to-br from-slate-600 to-slate-700 cursor-not-allowed opacity-70"
          : "bg-gradient-to-br from-indigo-500 to-violet-600 hover:shadow-brand animate-glow"
          }`}
        >
          <AnimatePresence mode="wait">
            {isRecording && (
              <motion.div key="rec" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="flex flex-col items-center gap-1">
                <Square className="w-7 h-7 fill-white" />
                <span className="text-xs">{fmt(seconds)}</span>
              </motion.div>
            )}
            {isProcessing && (
              <motion.div key="proc" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="flex flex-col items-center gap-1">
                <Loader2 className="w-7 h-7 animate-spin" />
                <span className="text-xs">AI...</span>
              </motion.div>
            )}
            {!isRecording && !isProcessing && (
              <motion.div key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="flex flex-col items-center gap-1">
                <Mic className="w-8 h-8" />
                <span className="text-xs font-medium">Speak</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Status label */}
      <AnimatePresence mode="wait">
        {isRecording && (
          <motion.p key="r" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-red-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Recording… tap button to stop
          </motion.p>
        )}
        {isProcessing && (
          <motion.p key="p" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-sm text-slate-400 animate-pulse">
            Understanding your request with IBM Granite AI…
          </motion.p>
        )}
        {state === "idle" && !errorMsg && (
          <motion.p key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-sm text-slate-500">
            Tap the orb and speak your civic complaint
          </motion.p>
        )}
      </AnimatePresence>

      {/* Live waveform canvas */}
      <canvas
        ref={canvasRef} width={340} height={52} aria-hidden="true"
        className="w-full max-w-sm rounded-xl border border-white/5 bg-white/[0.02]"
      />

      {/* Error */}
      <AnimatePresence>
        {state === "error" && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            role="alert"
            className="flex items-start gap-3 glass border border-red-500/30 rounded-xl px-4 py-3 max-w-sm w-full"
          >
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span className="text-xs text-red-300 flex-1">{errorMsg}</span>
            <button onClick={() => { setState("idle"); setErrorMsg(""); }}
              className="text-slate-400 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
