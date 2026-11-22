"use client";

/**
 * SahayaVoice – VoiceRecorder Component
 * Owner: Member 3 (Voice Recording & Audio Engineer)
 *
 * - Requests microphone permission
 * - Records audio via MediaRecorder (WebM/OGG)
 * - Renders a live waveform using AnalyserNode + canvas
 * - POSTs audio blob to /api/transcribe
 * - POSTs transcript to /api/process-voice
 * - Calls onResult() with the final VoiceResult
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { VoiceResult } from "@/app/page";

interface VoiceRecorderProps {
  language: string;
  onResult: (result: VoiceResult) => void;
  onProcessingChange: (processing: boolean) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function VoiceRecorder({
  language,
  onResult,
  onProcessingChange,
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Tap to Speak");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // ---------------------------------------------------------------------------
  // Waveform animation
  // ---------------------------------------------------------------------------
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#4f46e5"; // indigo-600
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }, []);

  const stopWaveform = () => {
    cancelAnimationFrame(animFrameRef.current);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ---------------------------------------------------------------------------
  // Start recording
  // ---------------------------------------------------------------------------
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawWaveform();

      // Set up MediaRecorder
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleRecordingStop;
      recorder.start(100); // collect chunks every 100ms
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setStatusText("Recording… Tap to Stop");
    } catch (err) {
      setError("Microphone access denied. Please allow microphone permission.");
      console.error("Microphone error:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Stop recording
  // ---------------------------------------------------------------------------
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopWaveform();
    setRecording(false);
    setStatusText("Processing…");
  };

  // ---------------------------------------------------------------------------
  // Handle recorded audio → STT → LLM
  // ---------------------------------------------------------------------------
  const handleRecordingStop = async () => {
    onProcessingChange(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });

      // Step 1: Transcribe
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("language", language);

      const sttRes = await fetch(`${API_URL}/api/transcribe`, {
        method: "POST",
        body: formData,
      });
      if (!sttRes.ok) throw new Error(`STT error: ${sttRes.status}`);
      const { transcript, language: detectedLang } = await sttRes.json();

      // Step 2: Process via LLM agent
      const llmRes = await fetch(`${API_URL}/api/process-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          language: detectedLang ?? language,
          session_id: crypto.randomUUID(),
        }),
      });
      if (!llmRes.ok) throw new Error(`LLM error: ${llmRes.status}`);
      const result: VoiceResult = await llmRes.json();
      onResult(result);
      setStatusText("Tap to Speak");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setStatusText("Tap to Speak");
    } finally {
      onProcessingChange(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <section className="flex flex-col items-center gap-6 w-full max-w-sm">
      {/* Pulse / recording button */}
      <button
        className={`
          w-28 h-28 rounded-full text-white text-sm font-semibold
          shadow-lg active:scale-95 transition-transform
          ${recording
            ? "bg-red-500 hover:bg-red-600 scale-105"
            : "bg-indigo-600 hover:bg-indigo-700 animate-pulse"
          }
        `}
        aria-label={recording ? "Stop recording" : "Tap to speak"}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? "🔴" : "🎙"}<br />
        {recording ? "Stop" : "Tap to"}<br />
        {recording ? "" : "Speak"}
      </button>

      {/* Live waveform canvas */}
      <canvas
        ref={canvasRef}
        width={320}
        height={40}
        className="w-full rounded bg-gray-100"
        aria-hidden="true"
      />

      {/* Status / error */}
      {error ? (
        <p className="text-xs text-red-500 text-center">{error}</p>
      ) : (
        <p className="text-xs text-gray-400 text-center">{statusText}</p>
      )}
    </section>
  );
}
