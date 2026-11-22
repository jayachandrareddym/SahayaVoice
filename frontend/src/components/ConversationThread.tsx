"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileCheck2, RotateCcw, Sparkles, UserRound } from "lucide-react";
import type { Turn } from "@/lib/types";

interface Props {
  turns: Turn[];
  thinking: boolean;
  onReset: () => void;
}

/** Chat-style view of the clarification loop between the user and SahayaVoice. */
export default function ConversationThread({ turns, thinking, onReset }: Props) {
  if (turns.length === 0 && !thinking) return null;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-xl"
      aria-label="Conversation"
      aria-live="polite"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Conversation</p>
        <button onClick={onReset} className="btn-ghost !px-2 !py-1 text-xs text-muted">
          <RotateCcw className="h-3.5 w-3.5" /> New request
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {turns.map((t) => {
            const mine = t.role === "user";
            return (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    mine ? "bg-ink/10 text-ink" : "bg-gradient-to-br from-accent to-violet text-accent-ink"
                  }`}
                  aria-hidden
                >
                  {mine ? <UserRound className="h-3.5 w-3.5" /> : t.kind === "letter" ? <FileCheck2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    mine
                      ? "rounded-br-md bg-accent text-accent-ink"
                      : "glass rounded-bl-md text-ink"
                  }`}
                >
                  <span className="sr-only">{mine ? "You said: " : "SahayaVoice: "}</span>
                  {t.text}
                </div>
              </motion.li>
            );
          })}
          {thinking && (
            <motion.li
              key="thinking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-end gap-2"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-accent to-violet text-accent-ink">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="glass flex gap-1.5 rounded-2xl rounded-bl-md px-4 py-3.5" aria-label="SahayaVoice is thinking">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted"
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.li>
          )}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
}
