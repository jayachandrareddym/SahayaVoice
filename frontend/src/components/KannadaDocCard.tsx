"use client";

/**
 * SahayaVoice – KannadaDocCard
 * Owner: Member 7 (TTS & Document Output)
 *
 * Letter on an animated "paper" sheet with typewriter reveal, tabs
 * (letter / summary / transcript), listen, copy, PDF, share, print,
 * and next steps as an interactive checklist.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Download, FileText, ListChecks, Loader2, Printer, Quote, ScrollText, Share2 } from "lucide-react";
import { downloadPdf } from "@/lib/api";
import { SUPPORTED_LANGUAGES, type VoiceResult } from "@/lib/types";
import AudioPlayer from "./AudioPlayer";
import { useToast } from "./Toaster";

type Tab = "letter" | "summary" | "transcript";

/** Grapheme split so Kannada conjuncts never render half-typed. */
function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: object) => { segment: (t: string) => Iterable<{ segment: string }> } }).Segmenter;
  return Seg ? Array.from(new Seg("kn", { granularity: "grapheme" }).segment(text), (s) => s.segment) : Array.from(text);
}

function useTypewriter(text: string, enabled: boolean) {
  const parts = useMemo(() => graphemes(text), [text]);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setCount(parts.length);
      return;
    }
    setCount(0);
    const duration = Math.min(2600, 600 + parts.length * 6);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * parts.length));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [parts, enabled]);
  return { shown: parts.slice(0, count).join(""), done: count >= parts.length, skip: () => setCount(parts.length) };
}

const parseSteps = (raw: string) =>
  raw.split(/\n+/).map((s) => s.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim()).filter(Boolean);

export default function KannadaDocCard({ result }: { result: VoiceResult }) {
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab>("letter");
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [listen, setListen] = useState<"summary" | "letter">("summary");
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const typer = useTypewriter(result.kannada_letter ?? "", !reduceMotion);
  const steps = useMemo(() => parseSteps(result.next_steps ?? ""), [result.next_steps]);
  const langName = SUPPORTED_LANGUAGES.find((l) => l.code === result.language)?.name ?? "English";
  const today = useMemo(() => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), []);

  useEffect(() => {
    setTab("letter");
    setChecked(new Set());
  }, [result]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.kannada_letter);
      setCopied(true);
      toast({ tone: "success", title: "Letter copied" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ tone: "error", title: "Couldn't copy", description: "Clipboard access was blocked." });
    }
  };

  const handlePdf = async () => {
    setPdfBusy(true);
    try {
      const url = URL.createObjectURL(await downloadPdf(result.kannada_letter, result.summary ?? ""));
      const a = document.createElement("a");
      a.href = url;
      a.download = `sahayavoice_${(result.intent ?? "complaint").toLowerCase()}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ tone: "success", title: "PDF downloaded" });
    } catch (err) {
      toast({ tone: "error", title: "PDF failed", description: err instanceof Error ? err.message : undefined });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "SahayaVoice complaint letter", text: result.kannada_letter });
      } catch {
        /* dismissed */
      }
    } else handleCopy();
  };

  const tabs = [
    { key: "letter" as Tab, label: "Letter", icon: ScrollText },
    { key: "summary" as Tab, label: `Summary · ${langName}`, icon: FileText },
    { key: "transcript" as Tab, label: "You said", icon: Quote },
  ];

  return (
    <motion.article
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass mx-auto w-full max-w-5xl overflow-hidden rounded-3xl shadow-card"
      aria-label="Generated complaint letter"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.25 }}
            className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success"
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </motion.span>
          <div>
            <p className="text-sm font-semibold">Your letter is ready</p>
            <p className="text-xs text-muted">{result.intent ? `${result.intent} · ` : ""}Formal Kannada · {today}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={handleCopy} className="btn-outline !py-1.5 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={handleShare} className="btn-outline !py-1.5 text-xs">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
          <button onClick={() => window.print()} className="btn-outline hidden !py-1.5 text-xs sm:inline-flex">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button onClick={handlePdf} disabled={pdfBusy} className="btn-primary !py-1.5 text-xs">
            {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        <div className="border-b hairline p-4 sm:p-6 lg:border-b-0 lg:border-r">
          <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-ink/[0.05] p-1">
            {tabs.map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  {active && <motion.span layoutId="doc-tab" className="absolute inset-0 rounded-lg bg-surface shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <Icon className="relative h-3.5 w-3.5" />
                  <span className="relative">{t.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {tab === "letter" && (
              <motion.div
                key="letter"
                initial={{ opacity: 0, rotateX: -8, y: 20 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformPerspective: 1000 }}
                className="print-area relative rounded-2xl bg-paper p-6 text-paper-ink shadow-paper sm:p-8"
              >
                <div className="mb-5 flex items-center justify-between border-b border-paper-ink/10 pb-3">
                  <span className="font-display text-lg italic text-paper-ink/70">ಸಹಾಯ</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-paper-ink/45">{today}</span>
                </div>
                <pre className="min-h-[220px] whitespace-pre-wrap font-kn text-[15px] leading-[1.9]" lang="kn" onClick={typer.skip}>
                  {typer.shown}
                  {!typer.done && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-caret bg-accent" />}
                </pre>
                {!typer.done && (
                  <button onClick={typer.skip} className="absolute bottom-3 right-4 text-[11px] text-paper-ink/50 hover:text-paper-ink">
                    Skip animation
                  </button>
                )}
                <AnimatePresence>
                  {typer.done && (
                    <motion.div
                      initial={{ scale: 2.2, opacity: 0, rotate: -25 }}
                      animate={{ scale: 1, opacity: 0.85, rotate: -12 }}
                      transition={{ type: "spring", stiffness: 260, damping: 14 }}
                      className="pointer-events-none absolute bottom-6 right-6 rounded-lg border-2 border-success px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-success"
                      aria-hidden
                    >
                      Ready to file
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
            {tab === "summary" && (
              <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl border hairline bg-surface-2/50 p-5">
                <p className="eyebrow mb-2">What the letter says</p>
                <p className="text-[15px] leading-relaxed">{result.summary || "No summary was returned."}</p>
              </motion.div>
            )}
            {tab === "transcript" && (
              <motion.div key="transcript" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="relative rounded-2xl border hairline bg-surface-2/50 p-5 pl-10">
                <Quote className="absolute left-4 top-5 h-4 w-4 text-accent" />
                <p className="font-display text-xl italic leading-snug">{result.transcript || "—"}</p>
                <p className="mt-3 text-xs text-muted">Language: {langName}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-6 p-4 sm:p-6">
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="eyebrow">Listen</p>
              <div className="flex rounded-lg bg-ink/[0.05] p-0.5 text-[11px]">
                {(["summary", "letter"] as const).map((k) => (
                  <button key={k} onClick={() => setListen(k)} className={`rounded-md px-2 py-1 font-medium transition-colors ${listen === k ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
                    {k === "summary" ? langName : "ಕನ್ನಡ letter"}
                  </button>
                ))}
              </div>
            </div>
            <AudioPlayer
              text={listen === "summary" ? result.summary || result.kannada_letter : result.kannada_letter}
              language={listen === "summary" ? result.language || "en" : "kn"}
              label={listen === "summary" ? `Summary in ${langName}` : "Full letter in Kannada"}
              onError={(m) => toast({ tone: "error", title: "Audio failed", description: m })}
            />
          </div>

          {steps.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <p className="eyebrow flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" /> Next steps
                </p>
                <span className="font-mono text-[11px] text-muted">{checked.size}/{steps.length}</span>
              </div>
              <div className="mb-3 h-1 overflow-hidden rounded-full bg-ink/10">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-success to-teal" animate={{ width: `${(checked.size / steps.length) * 100}%` }} />
              </div>
              <ol className="flex flex-col gap-2">
                {steps.map((s, i) => {
                  const done = checked.has(i);
                  return (
                    <motion.li key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
                      <button
                        onClick={() =>
                          setChecked((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          })
                        }
                        aria-pressed={done}
                        className="flex w-full items-start gap-3 rounded-xl border hairline bg-surface-2/40 p-3 text-left transition-colors hover:border-success/40"
                      >
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10px] font-bold transition-all ${done ? "border-success bg-success text-white" : "hairline text-muted"}`}>
                          {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                        </span>
                        <span className={`text-sm leading-relaxed ${done ? "text-muted line-through" : ""}`}>{s}</span>
                      </button>
                    </motion.li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
