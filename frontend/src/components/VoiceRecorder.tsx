"use client";

/**
 * SahayaVoice – VoiceRecorder (voice orb)
 * Owner: Member 3 (Voice Recording & Audio Engineer)
 *
 * - Requests microphone permission and records with MediaRecorder
 *   (picks a mime type the browser supports, so Safari works too)
 * - Renders a live radial frequency visualiser + level-reactive glow
 * - Space toggles recording, Esc cancels; auto-stops after MAX_SECONDS
 * - POSTs audio to /api/transcribe and hands the transcript to the page
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Mic, Square, X } from "lucide-react";
import { transcribe } from "@/lib/api";
import type { Stage } from "@/lib/types";

interface VoiceRecorderProps {
  language: string;
  stage: Stage;
  busy: boolean;
  onStageChange: (stage: Stage) => void;
  onTranscript: (transcript: string, detectedLanguage?: string) => void;
  onError: (message: string) => void;
}

const MAX_SECONDS = 60;
const MIME_CANDIDATES = [
  ["audio/webm;codecs=opus", "webm"],
  ["audio/webm", "webm"],
  ["audio/ogg;codecs=opus", "ogg"],
  ["audio/mp4", "mp4"],
] as const;

function pickMime(): { mime: string; ext: string } {
  if (typeof MediaRecorder === "undefined") return { mime: "", ext: "webm" };
  for (const [mime, ext] of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  }
  return { mime: "", ext: "webm" };
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function VoiceRecorder({
  language,
  stage,
  busy,
  onStageChange,
  onTranscript,
  onError,
}: VoiceRecorderProps) {
  const reduceMotion = useReducedMotion();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);
  const mimeRef = useRef(pickMime());

  // -------------------------------------------------------------------------
  // Visualiser: radial bars around the orb + an RMS level for the glow
  // -------------------------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const freq = new Uint8Array(analyser.frequencyBinCount);
    const time = new Uint8Array(analyser.fftSize);
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim().split(" ").join(",");
    const violet = styles.getPropertyValue("--violet").trim().split(" ").join(",");
    const BARS = 72;
    const center = size / 2;
    const inner = size * 0.33;

    const loop = () => {
      frameRef.current = requestAnimationFrame(loop);
      analyser.getByteFrequencyData(freq);
      analyser.getByteTimeDomainData(time);

      let sum = 0;
      for (let i = 0; i < time.length; i++) {
        const v = (time[i] - 128) / 128;
        sum += v * v;
      }
      setLevel(Math.min(1, Math.sqrt(sum / time.length) * 4));
      setElapsed((performance.now() - startedAtRef.current) / 1000);

      ctx.clearRect(0, 0, size, size);
      for (let i = 0; i < BARS; i++) {
        // Mirror the lower (voice-relevant) part of the spectrum around the circle
        const idx = Math.floor(((i < BARS / 2 ? i : BARS - i) / (BARS / 2)) * (freq.length * 0.45));
        const mag = freq[idx] / 255;
        const len = 4 + mag * size * 0.14;
        const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        const x1 = center + Math.cos(angle) * inner;
        const y1 = center + Math.sin(angle) * inner;
        const x2 = center + Math.cos(angle) * (inner + len);
        const y2 = center + Math.sin(angle) * (inner + len);
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `rgba(${accent},0.95)`);
        grad.addColorStop(1, `rgba(${violet},0.15)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };
    loop();
  }, []);

  const teardown = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setLevel(0);
  }, []);

  // -------------------------------------------------------------------------
  // Recorded audio → STT → page
  // -------------------------------------------------------------------------
  const handleStop = useCallback(async () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      onStageChange("idle");
      return;
    }
    const { mime, ext } = mimeRef.current;
    const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
    if (blob.size < 1200) {
      onStageChange("idle");
      onError("That was too short — hold on a little longer and speak clearly.");
      return;
    }
    onStageChange("transcribing");
    try {
      const { transcript, language: detected } = await transcribe(blob, `recording.${ext}`, language);
      if (!transcript?.trim()) throw new Error("We couldn't hear any words. Please try again closer to the mic.");
      onTranscript(transcript.trim(), detected);
    } catch (err) {
      onStageChange("error");
      onError(err instanceof Error ? err.message : "Transcription failed");
    }
  }, [language, onError, onStageChange, onTranscript]);

  const start = useCallback(async () => {
    if (busy || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("This browser can't record audio. Try Chrome, Edge or Safari — or type your request below.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AC();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.78;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const { mime } = mimeRef.current;
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = handleStop;
      recorder.start(100);
      recorderRef.current = recorder;

      startedAtRef.current = performance.now();
      setElapsed(0);
      setRecording(true);
      onStageChange("listening");
      if ("vibrate" in navigator) navigator.vibrate?.(12);
      requestAnimationFrame(draw);
    } catch (err) {
      teardown();
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      onError(
        denied
          ? "Microphone access was blocked. Allow it from the address bar, or type your request instead."
          : "Couldn't start the microphone. Check that one is connected.",
      );
    }
  }, [busy, recording, draw, handleStop, onError, onStageChange, teardown]);

  const stop = useCallback(
    (cancel = false) => {
      if (!recorderRef.current || recorderRef.current.state === "inactive") return;
      cancelledRef.current = cancel;
      recorderRef.current.stop();
      teardown();
      setRecording(false);
      if ("vibrate" in navigator) navigator.vibrate?.(8);
    },
    [teardown],
  );

  // Auto-stop at the time limit
  useEffect(() => {
    if (recording && elapsed >= MAX_SECONDS) stop();
  }, [recording, elapsed, stop]);

  // Keyboard: Space toggles, Esc cancels (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, button, [contenteditable]")) return;
      if (e.code === "Space") {
        e.preventDefault();
        recording ? stop() : start();
      } else if (e.key === "Escape" && recording) {
        stop(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording, start, stop]);

  useEffect(() => () => teardown(), [teardown]);

  const processing = stage === "transcribing" || stage === "understanding" || stage === "drafting";
  const glow = 0.35 + level * 0.65;

  const caption = recording
    ? "Listening… tap to finish"
    : processing
      ? "Working on it…"
      : "Tap to speak";

  return (
    <section className="relative flex flex-col items-center" aria-label="Voice input">
      <div className="relative grid h-[300px] w-[300px] place-items-center sm:h-[340px] sm:w-[340px]">
        {/* Visualiser canvas */}
        <canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${recording ? "opacity-100" : "opacity-0"}`}
        />

        {/* Idle breathing rings */}
        {!recording &&
          !reduceMotion &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute h-[168px] w-[168px] rounded-full border border-accent/30"
              initial={{ scale: 1, opacity: 0 }}
              animate={processing ? { rotate: 360, opacity: 0.5, scale: 1.08 + i * 0.12 } : { scale: [1, 1.75], opacity: [0.55, 0] }}
              transition={
                processing
                  ? { rotate: { duration: 3 + i, repeat: Infinity, ease: "linear" }, scale: { duration: 0.6 } }
                  : { duration: 3.2, repeat: Infinity, delay: i * 1.05, ease: "easeOut" }
              }
              style={processing ? { borderStyle: "dashed", borderColor: "rgb(var(--violet) / 0.45)" } : undefined}
            />
          ))}

        {/* Level-reactive glow */}
        <motion.div
          aria-hidden
          className="absolute h-[190px] w-[190px] rounded-full blur-2xl"
          animate={{ scale: recording ? 1 + level * 0.45 : processing ? 1.05 : 0.95, opacity: recording ? glow : 0.45 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{
            background: recording
              ? "radial-gradient(circle, rgb(var(--danger) / 0.7), rgb(var(--accent) / 0.25) 60%, transparent 70%)"
              : "radial-gradient(circle, rgb(var(--accent) / 0.55), rgb(var(--violet) / 0.25) 60%, transparent 70%)",
          }}
        />

        {/* The orb */}
        <motion.button
          type="button"
          onClick={() => (recording ? stop() : start())}
          disabled={busy && !recording}
          aria-label={recording ? "Stop recording" : "Start recording"}
          aria-pressed={recording}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          animate={{ scale: recording ? 1 + level * 0.08 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="relative z-10 grid h-[150px] w-[150px] place-items-center rounded-full text-accent-ink disabled:cursor-wait sm:h-[164px] sm:w-[164px]"
          style={{
            background: recording
              ? "radial-gradient(circle at 30% 25%, rgb(255 255 255 / 0.35), transparent 45%), linear-gradient(140deg, rgb(var(--danger)), rgb(var(--accent)))"
              : "radial-gradient(circle at 30% 25%, rgb(255 255 255 / 0.45), transparent 45%), linear-gradient(140deg, rgb(var(--accent)), rgb(var(--violet)))",
            boxShadow:
              "inset 0 -10px 30px rgb(0 0 0 / 0.25), inset 0 2px 0 rgb(255 255 255 / 0.35), 0 25px 60px -15px rgb(var(--accent) / 0.6)",
          }}
        >
          {/* Conic sheen */}
          <span
            aria-hidden
            className="absolute inset-[3px] animate-spin-slow rounded-full opacity-40 mix-blend-overlay"
            style={{ background: "conic-gradient(from 0deg, transparent, white, transparent 30%)" }}
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={recording ? "rec" : processing ? "busy" : "idle"}
              initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0, rotate: 30 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
              className="relative"
            >
              {recording ? (
                <Square className="h-10 w-10 fill-current" />
              ) : processing ? (
                <Loader2 className="h-11 w-11 animate-spin" />
              ) : (
                <Mic className="h-12 w-12" strokeWidth={2.2} />
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Caption, timer, cancel */}
      <div className="-mt-4 flex h-14 flex-col items-center gap-1.5">
        <AnimatePresence mode="wait">
          <motion.p
            key={caption}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`text-sm font-medium ${processing ? "shimmer-text" : "text-ink/80"}`}
          >
            {caption}
          </motion.p>
        </AnimatePresence>

        {recording ? (
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5 font-mono tabular-nums">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
              {fmt(elapsed)} / {fmt(MAX_SECONDS)}
            </span>
            <button onClick={() => stop(true)} className="flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-ink/[0.06] hover:text-ink">
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        ) : (
          !processing && (
            <p className="hidden text-xs text-muted sm:block">
              or press <kbd className="rounded-md border hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">Space</kbd>
            </p>
          )
        )}
      </div>
    </section>
  );
}
