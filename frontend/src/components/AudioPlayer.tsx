"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pause, Play } from "lucide-react";
import { speak } from "@/lib/api";

interface Props {
  text: string;
  language: string;
  label: string;
  onError: (message: string) => void;
}

const fmt = (s: number) =>
  Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";

/** Fetches TTS once per text, then plays/pauses with a seekable progress bar. */
export default function AudioPlayer({ text, language, label, onError }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      audioRef.current = null;
      urlRef.current = null;
      setState("idle");
      setTime(0);
      setDuration(0);
    };
  }, [text, language]);

  const toggle = async () => {
    const a = audioRef.current;
    if (a) {
      if (a.paused) {
        await a.play();
        setState("playing");
      } else {
        a.pause();
        setState("paused");
      }
      return;
    }
    setState("loading");
    try {
      const url = URL.createObjectURL(await speak(text, language));
      urlRef.current = url;
      const audio = new Audio(url);
      audio.ontimeupdate = () => setTime(audio.currentTime);
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onended = () => {
        setState("paused");
        setTime(0);
      };
      audioRef.current = audio;
      await audio.play();
      setState("playing");
    } catch (err) {
      setState("idle");
      onError(err instanceof Error ? err.message : "Playback failed");
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * duration;
  };

  const pct = duration ? (time / duration) * 100 : 0;
  const playing = state === "playing";

  return (
    <div className="flex items-center gap-3 rounded-2xl border hairline bg-surface-2/60 p-2 pr-4">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggle}
        disabled={state === "loading"}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink shadow-glow"
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        )}
      </motion.button>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium">{label}</p>
          <div className="flex h-3 items-end gap-[2px]" aria-hidden>
            {[0.6, 1, 0.45, 0.85, 0.55].map((h, i) => (
              <span
                key={i}
                className={`w-[3px] origin-bottom rounded-full bg-accent ${playing ? "animate-eq" : ""}`}
                style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s`, transform: playing ? undefined : "scaleY(0.3)" }}
              />
            ))}
          </div>
        </div>
        <div onClick={seek} className="group relative h-1.5 cursor-pointer rounded-full bg-ink/10" role="progressbar" aria-valuenow={Math.round(pct)}>
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-violet" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-muted">
          <span>{fmt(time)}</span>
          <span>{duration ? fmt(duration) : "--:--"}</span>
        </div>
      </div>
    </div>
  );
}
