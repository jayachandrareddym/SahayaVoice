"use client";
import { motion } from "framer-motion";
import { Mic, Brain, Search, FileText, Volume2, Download, Building2, Zap } from "lucide-react";

const STEPS = [
  { n: "01", icon: Mic,       title: "Speak Naturally",           desc: "Tap the orb and speak your complaint in any Indian language — Kannada, Hindi, Tamil, Telugu or English." },
  { n: "02", icon: Brain,     title: "AI Understands",            desc: "IBM Granite on watsonx.ai transcribes your voice, detects the language and extracts your civic intent." },
  { n: "03", icon: Search,    title: "Identify Civic Issue",      desc: "The AI agent classifies your complaint — BESCOM, BWSSB, BBMP, rental dispute — and gathers missing details." },
  { n: "04", icon: FileText,  title: "Generate Kannada Letter",   desc: "A formal, grammatically correct Kannada complaint letter is generated, ready for official submission." },
  { n: "05", icon: Download,  title: "Download & Submit",         desc: "Copy the letter, listen to it via TTS, download as PDF, and submit to the appropriate authority." },
];

const FEATURES = [
  { icon: Mic,       title: "Multilingual Voice",        desc: "Kannada · Hindi · Tamil · Telugu · English + Kanglish" },
  { icon: Brain,     title: "IBM Granite AI",            desc: "Intent extraction and formal Kannada letter generation via watsonx.ai" },
  { icon: Search,    title: "Smart Clarification",       desc: "Asks follow-up questions in your language when details are missing" },
  { icon: FileText,  title: "Kannada Generation",        desc: "Formal, grammatically accurate civic complaint letters" },
  { icon: Volume2,   title: "Natural TTS",               desc: "Sarvam AI bulbul + Edge-TTS for natural Indian language playback" },
  { icon: Download,  title: "PDF Export",                desc: "Beautifully formatted PDF with Kannada font support" },
  { icon: Building2, title: "Civic Classification",      desc: "BESCOM · BWSSB · BBMP · Rental Disputes · More" },
  { icon: Zap,       title: "One-Click Demo",            desc: "Three pre-built scenarios for instant judging demonstration" },
];

export default function InfoSections() {
  return (
    <>
      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="w-full max-w-5xl py-16 px-4">
        <div className="text-center mb-14">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">How It Works</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.1 }} className="text-3xl sm:text-4xl font-bold text-white">
            From your voice to an official document
          </motion.h2>
        </div>

        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

          <div className="grid md:grid-cols-5 gap-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-2xl glass-dark border border-indigo-500/30 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-indigo-400" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{s.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="w-full max-w-5xl py-16 px-4">
        <div className="text-center mb-14">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">Features</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.1 }} className="text-3xl sm:text-4xl font-bold text-white">
            Everything you need to file your complaint
          </motion.h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="glass-dark rounded-2xl border border-white/8 p-5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition-colors">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>
    </>
  );
}
