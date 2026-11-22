"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, Home, ArrowRight, Loader2 } from "lucide-react";
import { VoiceResult } from "@/app/page";

interface DemoPresetsProps {
  language: string;
  onPresetSelected: (result: VoiceResult) => void;
  disabled?: boolean;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const PRESETS = [
  {
    id: "bescom_whitefield",
    icon: Zap,
    color: "from-yellow-500/20 to-orange-500/20",
    border: "border-yellow-500/30",
    iconColor: "text-yellow-400",
    category: "Electricity",
    location: "Whitefield",
    title: "BESCOM Power Issue",
    description: "Report power fluctuation or outage to BESCOM via formal Kannada complaint.",
  },
  {
    id: "bwssb_jayanagar",
    icon: Droplets,
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
    iconColor: "text-blue-400",
    category: "Water Supply",
    location: "Jayanagar",
    title: "BWSSB Water Issue",
    description: "Report water supply disruption to BWSSB with an official letter.",
  },
  {
    id: "rental_koramangala",
    icon: Home,
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
    iconColor: "text-violet-400",
    category: "Rental Dispute",
    location: "Koramangala",
    title: "Landlord Deposit Dispute",
    description: "File a formal complaint for security deposit non-refund.",
  },
] as const;

export default function DemoPresets({ language, onPresetSelected, disabled = false }: DemoPresetsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState("");

  const handlePreset = async (presetId: string) => {
    setError(""); setLoading(presetId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/demo-preset`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: presetId, language }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.detail ?? `HTTP ${res.status}`); }
      onPresetSelected(await res.json() as VoiceResult);
    } catch (err) { setError(err instanceof Error ? err.message : "Demo preset failed"); }
    finally { setLoading(null); }
  };

  return (
    <section id="demo" className="w-full max-w-5xl py-8">
      <div className="text-center mb-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2"
        >
          Live Demo
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="text-3xl font-bold text-white mb-3"
        >
          Try a Demo Scenario
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: 0.2 }}
          className="text-slate-400 text-sm max-w-md mx-auto"
        >
          Click any scenario to see SahayaVoice generate a real Kannada complaint letter instantly — no microphone needed.
        </motion.p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {PRESETS.map((p, i) => {
          const Icon = p.icon;
          const isLoading = loading === p.id;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`glass-dark rounded-2xl border ${p.border} p-5 cursor-pointer group`}
              onClick={() => !disabled && !loading && handlePreset(p.id)}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${p.iconColor}`} />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${p.iconColor} uppercase tracking-wider`}>{p.category}</span>
                <span className="text-xs text-slate-600">·</span>
                <span className="text-xs text-slate-500">{p.location}</span>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{p.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{p.description}</p>
              <button
                disabled={disabled || loading !== null}
                className="flex items-center gap-2 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors disabled:opacity-40"
              >
                {isLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                  : <><span>Try Demo</span><ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></>
                }
              </button>
            </motion.div>
          );
        })}
      </div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          role="alert" className="mt-4 text-xs text-red-400 text-center">
          {error}
        </motion.p>
      )}
    </section>
  );
}
