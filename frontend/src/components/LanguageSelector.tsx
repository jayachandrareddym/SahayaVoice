"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "kn", label: "ಕನ್ನಡ",  name: "Kannada"  },
  { code: "hi", label: "हिन्दी", name: "Hindi"    },
  { code: "ta", label: "தமிழ்", name: "Tamil"    },
  { code: "te", label: "తెలుగు", name: "Telugu"   },
  { code: "en", label: "English", name: "English"  },
] as const;

type LangCode = (typeof LANGUAGES)[number]["code"];

interface LanguageSelectorProps {
  value: LangCode;
  onChange: (code: LangCode) => void;
}

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === value)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 glass-dark border border-white/15 rounded-full px-4 py-2 text-sm text-white hover:border-indigo-500/40 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        aria-label="Select language"
        aria-expanded={open}
      >
        <span className="font-medium">{current.label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 glass-dark border border-white/15 rounded-2xl overflow-hidden shadow-glass min-w-[160px]"
            >
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { onChange(lang.code); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5 ${
                    lang.code === value ? "text-indigo-300 bg-indigo-500/10" : "text-slate-300"
                  }`}
                >
                  <span className="font-medium">{lang.label}</span>
                  <span className="text-xs text-slate-500">{lang.name}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
