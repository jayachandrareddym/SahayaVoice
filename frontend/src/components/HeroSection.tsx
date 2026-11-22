"use client";
import { motion } from "framer-motion";
import { Mic, FileText, ChevronDown } from "lucide-react";

const TRUST_ITEMS = [
  { icon: "🌐", label: "5 Indian Languages" },
  { icon: "🧠", label: "IBM Granite AI" },
  { icon: "📄", label: "Kannada Documents" },
  { icon: "🏙️", label: "Built for Bengaluru" },
];

const LANG_BADGES = ["ಕನ್ನಡ", "हिन्दी", "தமிழ்", "తెలుగు", "English"];

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen bg-mesh flex flex-col items-center justify-center overflow-hidden pt-24 pb-16 px-4"
    >
      {/* Decorative floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-indigo-300 font-medium mb-8 border border-indigo-500/30"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          IBM Bobathon 2026 · Voice AI Track · Bengaluru
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-tight mb-6"
        >
          Your Voice.{" "}
          <span className="text-gradient">Your Language.</span>
          <br />
          Your Rights.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Speak naturally in any Indian language. SahayaVoice understands your civic complaint,
          generates a formal Kannada document, and helps you get your rights recognized — all in seconds.
        </motion.p>

        {/* Language badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-10"
        >
          {LANG_BADGES.map((lang, i) => (
            <motion.span
              key={lang}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 + i * 0.07 }}
              className="glass px-3 py-1 rounded-full text-sm text-slate-200 font-medium"
            >
              {lang}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <a
            href="#voice-assistant"
            className="btn-brand flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-full"
          >
            <Mic className="w-5 h-5" />
            Start Speaking
          </a>
          <a
            href="#demo"
            className="btn-ghost flex items-center gap-2 px-8 py-4 text-base font-medium rounded-full"
          >
            <FileText className="w-5 h-5" />
            Explore Demo
          </a>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto"
        >
          {TRUST_ITEMS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 + i * 0.08 }}
              className="glass rounded-xl px-3 py-3 text-center"
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-xs text-slate-300 font-medium">{item.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="mt-16 flex flex-col items-center gap-1 text-slate-500 text-xs"
        >
          <ChevronDown className="w-5 h-5" />
          <span>Scroll to explore</span>
        </motion.div>
      </div>
    </section>
  );
}
