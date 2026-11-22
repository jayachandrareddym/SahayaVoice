"use client";

/**
 * SahayaVoice – VoiceRecorder Component
 * Owner: Member 3 (Voice Recording & Audio Engineer)
 *
 * Responsibilities:
 *   - Request microphone permission (getUserMedia)
 *   - Record audio via MediaRecorder API, collect chunks
 *   - Show live waveform animation (canvas + AnalyserNode + requestAnimationFrame)
 *   - POST audio blob to /api/transcribe with language hint  (→ M4/M5)
 *   - POST transcript to /api/process-voice                  (→ M6)
 *   - Call onResult() with the final VoiceResult
 *   - Handle mic permission errors and recording failures gracefully
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceResult } from "@/app/page";

interface VoiceRecorderProps {
  language: string;
  onResult: (result: VoiceResult) => void;
  onProcessingChange: (processing: boolean) => void;
}

type RecordingState = "idle" | "recording" | "processing" | "error";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export default function VoiceRecorder({
  language,
  onResult,
  onProcessingChange,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [seconds, setSeconds] = useState(0);

  // Refs for audio pipeline
  const streamRef        = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const animFrameRef     = useRef<number>(0);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // Canvas ref for waveform
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Waveform drawing ──────────────────────────────────────────────────────
  const drawWaveform = useCallback(() => {
    const canvas   = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx    = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray    = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Wave line
    ctx.lineWidth   = 2;
    ctx.strokeStyle = "#4f46e5"; // indigo-600
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  // ── Draw idle flat line ───────────────────────────────────────────────────
  const drawIdleLine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth   = 2;
    ctx.strokeStyle = "#d1d5db";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    drawIdleLine();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawIdleLine]);

  // ── Start recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    setErrorMsg("");
    setSeconds(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMsg("Microphone permission denied. Please allow mic access and try again.");
      setState("error");
      return;
    }

    streamRef.current = stream;

    // Web Audio API for waveform
    const audioCtx = new AudioContext();
    const source   = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    // MediaRecorder
    const mimeType    = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
    const recorder    = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = handleRecordingStop;
    recorder.start(100); // collect chunks every 100 ms

    setState("recording");
    onProcessingChange(false);
    drawWaveform();

    // Timer
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close();
    drawIdleLine();
    setState("processing");
    onProcessingChange(true);
  };

  // ── After recording stops – send to backend ───────────────────────────────
  const handleRecordingStop = async () => {
    const mimeType = mediaRecorderRef.current?.mimeType ?? "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });

    try {
      // 1️⃣  POST audio → /api/transcribe (M4/M5 owns the implementation)
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("language", language);

      const transcribeRes = await fetch(`${BACKEND_URL}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) {
        throw new Error(`Transcription failed: ${transcribeRes.status} ${transcribeRes.statusText}`);
      }

      const { transcript } = await transcribeRes.json() as { transcript: string };

      // 2️⃣  POST transcript → /api/process-voice (M6 owns the implementation)
      const processRes = await fetch(`${BACKEND_URL}/api/process-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, language }),
      });

      if (!processRes.ok) {
        throw new Error(`Processing failed: ${processRes.status} ${processRes.statusText}`);
      }

      const result = await processRes.json() as VoiceResult;
      onResult(result);
      setState("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(`Error: ${msg}`);
      setState("error");
    } finally {
      onProcessingChange(false);
    }
  };

  // ── Button label & style helpers ──────────────────────────────────────────
  const isRecording   = state === "recording";
  const isProcessing  = state === "processing";
  const buttonDisabled = isProcessing;

  const buttonClass = [
    "w-28 h-28 rounded-full text-white text-sm font-semibold shadow-lg transition-all",
    "focus:outline-none focus:ring-4 focus:ring-indigo-300",
    isRecording  ? "bg-red-500 hover:bg-red-600 scale-105 animate-pulse" : "",
    isProcessing ? "bg-gray-400 cursor-not-allowed" : "",
    !isRecording && !isProcessing ? "bg-indigo-600 hover:bg-indigo-700 active:scale-95" : "",
  ].join(" ");

  const handleClick = () => {
    if (isRecording)   stopRecording();
    else if (!isProcessing) startRecording();
  };

  // ── Format seconds as mm:ss ───────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <section className="flex flex-col items-center gap-4 w-full max-w-sm" aria-label="Voice recorder">

      {/* Tap to Speak / Recording / Processing button */}
      <button
        className={buttonClass}
        aria-label={isRecording ? "Stop recording" : isProcessing ? "Processing…" : "Tap to speak"}
        disabled={buttonDisabled}
        onClick={handleClick}
      >
        {isRecording   && <><span className="text-lg">⏹</span><br />Stop<br />{formatTime(seconds)}</>}
        {isProcessing  && <><span className="text-lg">⏳</span><br />Processing…</>}
        {!isRecording && !isProcessing && <><span className="text-lg">🎙</span><br />Tap to<br />Speak</>}
      </button>

      {/* Live waveform canvas */}
      <canvas
        ref={canvasRef}
        width={320}
        height={56}
        className="w-full rounded-lg border border-gray-200"
        aria-hidden="true"
      />

      {/* Recording hint */}
      {isRecording && (
        <p className="text-xs text-red-500 font-medium animate-pulse">
          🔴 Recording… tap button to stop
        </p>
      )}
      {isProcessing && (
        <p className="text-xs text-gray-500">Transcribing and processing your voice…</p>
      )}

      {/* Error message */}
      {state === "error" && errorMsg && (
        <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full text-center">
          {errorMsg}
        </p>
      )}
    </section>
  );
}
