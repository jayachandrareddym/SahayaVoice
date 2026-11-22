"use client";

/**
 * SahayaVoice – DemoPresets
 * Owner: Member 8 (QA, Demo & Documentation)
 *
 * Three one-click scenarios for judging. Each fires POST /api/demo-preset,
 * which returns a pre-filled VoiceResult without calling the LLM.
 */

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Droplets, Home, Loader2, Zap } from "lucide-react";
import { demoPreset } from "@/lib/api";
import type { VoiceResult } from "@/lib/types";

interface DemoPresetsProps {
  language: string;
  onPresetSelected: (result: VoiceResult) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

const PRESETS = [
  {
    id: "bescom_whitefield",
    dept: "BESCOM",
    title: "Power fluctuation",
    place: "Whitefield",
    blurb: "Voltage swings damaging home appliances.",
    icon: Zap,
    hue: "var(--accent)",
  },
  {
    id: "bwssb_jayanagar",
    dept: "BWSSB",
    title: "No water supply",
    place: "Jayanagar",
    blurb: "Supply cut for several days in the block.",
    icon: Droplets,
    hue: "var(--teal)",
  },
  {
    id: "rental_koramangala",
    dept: "Rental",
    title: "Deposit not refunded",
    place: "Koramangala",
    blurb: "Landlord withholding the security deposit.",
    icon: Home,
    hue: "var(--violet)",
  },
] as const;

function PresetCard({
  preset,
  index,
  loading,
  disabled,
  onClick,
}: {
  preset: (typeof PRESETS)[number];
  index: number;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const Icon = preset.icon;

  // Spotlight + gentle 3D tilt that follows the pointer
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--rx", `${((y / r.height) - 0.5) * -6}deg`);
    el.style.setProperty("--ry", `${((x / r.width) - 0.5) * 6}deg`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.97 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
      disabled={disabled}
      className="group glass relative overflow-hidden rounded-2xl p-4 text-left shadow-card transition-[transform,border-color] duration-200 [transform:perspective(800px)_rotateX(var(--rx,0))_rotateY(var(--ry,0))] hover:border-[rgb(var(--hue)/0.45)] disabled:cursor-not-allowed disabled:opacity-50"
      style={{ ["--hue" as string]: preset.hue }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(260px circle at var(--mx) var(--my), rgb(var(--hue) / 0.16), transparent 60%)" }}
      />
      <div className="relative flex items-start justify-between">
        <span
          className="grid h-10 w-10 place-items-center rounded-xl"
          style={{ background: "rgb(var(--hue) / 0.15)", color: "rgb(var(--hue))" }}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
        </span>
        <ArrowUpRight className="h-4 w-4 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgb(var(--hue))" }}>
        {preset.dept} · {preset.place}
      </p>
      <p className="relative mt-1 font-semibold">{preset.title}</p>
      <p className="relative mt-1 text-xs leading-relaxed text-muted">{preset.blurb}</p>
    </motion.button>
  );
}

export default function DemoPresets({ language, onPresetSelected, onError, disabled = false }: DemoPresetsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePreset = async (presetId: string) => {
    setLoading(presetId);
    try {
      onPresetSelected(await demoPreset(presetId, language));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't load the demo");
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl" aria-labelledby="demo-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Try a scenario</p>
          <h2 id="demo-heading" className="mt-1 font-display text-2xl sm:text-3xl">
            One tap, <em className="text-gradient">a ready letter</em>
          </h2>
        </div>
        <p className="hidden max-w-[220px] text-right text-xs text-muted sm:block">
          Pre-recorded cases that work even without an AI key.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PRESETS.map((p, i) => (
          <PresetCard
            key={p.id}
            preset={p}
            index={i}
            loading={loading === p.id}
            disabled={disabled || loading !== null}
            onClick={() => handlePreset(p.id)}
          />
        ))}
      </div>
    </section>
  );
}
