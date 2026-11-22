"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { checkHealth } from "@/lib/api";

interface HeaderProps {
  voiceReplies: boolean;
  onToggleVoiceReplies: () => void;
  historyCount: number;
  onOpenHistory: () => void;
}

type Health = "checking" | "online" | "offline";

function LogoMark() {
  return (
    <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent via-[rgb(var(--accent)/0.85)] to-violet shadow-glow">
      <div className="flex h-4 items-center gap-[3px]">
        {[0.5, 1, 0.7, 0.9].map((h, i) => (
          <span
            key={i}
            className="block w-[3px] origin-center animate-eq rounded-full bg-accent-ink/90"
            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Header({ voiceReplies, onToggleVoiceReplies, historyCount, onOpenHistory }: HeaderProps) {
  const [health, setHealth] = useState<Health>("checking");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as "dark" | "light") ?? "dark");
    const ctrl = new AbortController();
    const ping = async () => setHealth((await checkHealth(ctrl.signal)) ? "online" : "offline");
    ping();
    const id = setInterval(ping, 15000);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sv-theme", next);
    } catch {
      /* storage blocked */
    }
  };

  const dot = { checking: "bg-muted", online: "bg-success", offline: "bg-danger" }[health];
  const label = { checking: "Connecting", online: "Live", offline: "Offline" }[health];

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass sticky top-3 z-40 mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl px-3 py-2.5 shadow-card sm:px-4"
    >
      <a href="#top" className="flex items-center gap-2.5">
        <LogoMark />
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight">SahayaVoice</p>
          <p className="hidden text-[11px] text-muted sm:block">ಸಹಾಯ · Civic voice assistant</p>
        </div>
      </a>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <div
          className="mr-1 hidden items-center gap-2 rounded-full border hairline px-2.5 py-1 text-xs text-muted sm:flex"
          title={health === "offline" ? "Backend not reachable — demo presets and voice will fail" : "Backend status"}
        >
          <span className="relative flex h-2 w-2">
            {health === "online" && <span className={`absolute inset-0 animate-ping rounded-full ${dot} opacity-60`} />}
            <span className={`relative h-2 w-2 rounded-full ${dot}`} />
          </span>
          {label}
        </div>

        <button
          onClick={onToggleVoiceReplies}
          className="btn-ghost h-9 w-9 !p-0"
          aria-pressed={voiceReplies}
          aria-label={voiceReplies ? "Turn off spoken replies" : "Turn on spoken replies"}
          title={voiceReplies ? "Spoken replies on" : "Spoken replies off"}
        >
          {voiceReplies ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px] text-muted" />}
        </button>

        <button onClick={onOpenHistory} className="btn-ghost relative h-9 w-9 !p-0" aria-label="Open saved letters">
          <History className="h-[18px] w-[18px]" />
          {historyCount > 0 && (
            <motion.span
              key={historyCount}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink"
            >
              {historyCount}
            </motion.span>
          )}
        </button>

        <button onClick={toggleTheme} className="btn-ghost h-9 w-9 overflow-hidden !p-0" aria-label="Toggle colour theme">
          <motion.span
            key={theme}
            initial={{ y: 18, rotate: -90, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {theme === "dark" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </motion.span>
        </button>
      </div>
    </motion.header>
  );
}
