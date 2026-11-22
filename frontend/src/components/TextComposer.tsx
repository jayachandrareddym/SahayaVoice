"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Keyboard } from "lucide-react";

interface Props {
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (text: string) => void;
}

/** Typed fallback for noisy places, blocked mics, or answering a follow-up quietly. */
export default function TextComposer({ disabled, placeholder, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSubmit(value);
    setText("");
  };

  return (
    <motion.form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      animate={{ scale: focused ? 1.01 : 1 }}
      className={`glass relative mx-auto flex w-full max-w-xl items-end gap-2 rounded-2xl p-2 pl-4 transition-shadow duration-300 ${
        focused ? "shadow-glow" : "shadow-card"
      }`}
    >
      <Keyboard className="mb-2.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
      <textarea
        value={text}
        rows={1}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder ?? "Or type it — e.g. “No water in Jayanagar 4th block since 3 days”"}
        aria-label="Type your request"
        className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-muted/70 [field-sizing:content] focus-visible:outline-none"
      />
      <motion.button
        type="submit"
        disabled={disabled || !text.trim()}
        whileTap={{ scale: 0.9 }}
        aria-label="Send"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink transition-all disabled:bg-ink/10 disabled:text-muted"
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
      </motion.button>
    </motion.form>
  );
}
