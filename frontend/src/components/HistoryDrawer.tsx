"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, Trash2, X } from "lucide-react";
import type { HistoryItem } from "@/lib/types";

interface Props {
  open: boolean;
  items: HistoryItem[];
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

/** Slide-over list of letters generated on this device (stored locally). */
export default function HistoryDrawer({ open, items, onClose, onSelect, onClear }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-label="Saved letters"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l hairline bg-surface shadow-card"
          >
            <div className="flex items-center justify-between border-b hairline p-4">
              <div>
                <p className="font-semibold">Saved letters</p>
                <p className="text-xs text-muted">Kept only on this device</p>
              </div>
              <button onClick={onClose} className="btn-ghost h-9 w-9 !p-0" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {items.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-sm text-muted">
                  <div>
                    <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    Letters you generate will appear here.
                  </div>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((item, i) => (
                    <motion.li key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <button onClick={() => onSelect(item)} className="w-full rounded-xl border hairline bg-surface-2/50 p-3 text-left transition-colors hover:border-accent/50">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{item.result.intent ?? "Complaint"}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm">{item.title}</p>
                        <p className="mt-1 text-[11px] text-muted">{new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
            {items.length > 0 && (
              <div className="border-t hairline p-3">
                <button onClick={onClear} className="btn-ghost w-full text-danger">
                  <Trash2 className="h-4 w-4" /> Clear all
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
