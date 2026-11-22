"use client";

import { motion } from "framer-motion";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/types";

interface Props {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
  disabled?: boolean;
}

/** Segmented control with a spring-animated selection pill. */
export default function LanguageSwitcher({ value, onChange, disabled }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Language you will speak"
      className="glass mx-auto flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1"
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = lang.code === value;
        return (
          <button
            key={lang.code}
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(lang.code)}
            title={lang.name}
            className={`relative shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 sm:px-4 ${
              active ? "text-accent-ink" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 rounded-xl bg-accent shadow-glow"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
            <span className="relative font-kn">{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}
