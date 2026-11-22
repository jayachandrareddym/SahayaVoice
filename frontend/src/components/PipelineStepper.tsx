"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Check, FileText, Languages, Sparkles } from "lucide-react";
import type { Stage } from "@/lib/types";

const STEPS = [
  { key: "listening", label: "Listening", icon: AudioLines },
  { key: "transcribing", label: "Transcribing", icon: Languages },
  { key: "understanding", label: "Understanding", icon: Sparkles },
  { key: "drafting", label: "Drafting letter", icon: FileText },
] as const;

const ORDER: Record<string, number> = { listening: 0, transcribing: 1, understanding: 2, drafting: 3, done: 4 };

/** Animated progress rail for the voice → letter pipeline. Hidden when idle. */
export default function PipelineStepper({ stage }: { stage: Stage }) {
  const visible = stage !== "idle" && stage !== "error";
  const current = ORDER[stage] ?? -1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.ol
          initial={{ opacity: 0, height: 0, y: -8 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex w-full max-w-xl items-center justify-between gap-1 overflow-hidden px-2"
          aria-label="Progress"
        >
          {STEPS.map((step, i) => {
            const state = i < current ? "done" : i === current ? "active" : "todo";
            const Icon = state === "done" ? Check : step.icon;
            return (
              <li key={step.key} className="flex flex-1 items-center gap-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <motion.div
                    animate={{ scale: state === "active" ? 1.1 : 1 }}
                    className={`relative grid h-9 w-9 place-items-center rounded-full border transition-colors duration-500 ${
                      state === "done"
                        ? "border-success/40 bg-success/15 text-success"
                        : state === "active"
                          ? "border-accent/60 bg-accent/15 text-accent"
                          : "hairline bg-surface/50 text-muted"
                    }`}
                  >
                    {state === "active" && (
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-accent"
                        animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                      />
                    )}
                    <Icon className="h-4 w-4" />
                  </motion.div>
                  <span
                    className={`whitespace-nowrap text-[10px] font-medium sm:text-[11px] ${
                      state === "todo" ? "text-muted/70" : "text-ink/90"
                    }`}
                    aria-current={state === "active" ? "step" : undefined}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="relative mb-5 h-[2px] flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-success to-accent"
                      initial={false}
                      animate={{ width: i < current ? "100%" : "0%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </motion.ol>
      )}
    </AnimatePresence>
  );
}
