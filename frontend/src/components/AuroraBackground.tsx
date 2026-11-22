"use client";

import { useEffect, useRef } from "react";

/**
 * Slow-moving aurora blobs, a masked grid and a soft spotlight that follows
 * the pointer. Purely decorative: fixed, behind everything, aria-hidden.
 */
export default function AuroraBackground() {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spotRef.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${e.clientX - 300}px, ${e.clientY - 300}px, 0)`;
        el.style.opacity = "1";
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -left-[10%] -top-[20%] h-[60vmax] w-[60vmax] animate-aurora rounded-full bg-violet/25 blur-[120px]" />
      <div className="absolute -right-[15%] top-[10%] h-[50vmax] w-[50vmax] animate-aurora-slow rounded-full bg-accent/20 blur-[120px]" />
      <div className="absolute -bottom-[25%] left-[20%] h-[55vmax] w-[55vmax] animate-aurora rounded-full bg-teal/15 blur-[130px] [animation-delay:-8s]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--line) / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--line) / 0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 30%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 30%, black 30%, transparent 80%)",
        }}
      />
      <div
        ref={spotRef}
        className="absolute left-0 top-0 h-[600px] w-[600px] rounded-full opacity-0 transition-opacity duration-700"
        style={{ background: "radial-gradient(circle, rgb(var(--accent) / 0.08), transparent 60%)" }}
      />
    </div>
  );
}
