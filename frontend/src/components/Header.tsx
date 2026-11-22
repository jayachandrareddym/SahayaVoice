"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Zap, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home",         href: "#hero" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features",     href: "#features" },
  { label: "Demo",         href: "#demo" },
];

export default function Header() {
  const [scrolled,     setScrolled]     = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-dark shadow-glass py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-brand">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white group-hover:text-gradient transition-all">
            SahayaVoice
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-300 hover:text-white transition-colors font-medium"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#voice-assistant"
            className="btn-brand flex items-center gap-2 px-5 py-2 text-sm"
          >
            <Zap className="w-4 h-4" />
            Start Speaking
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-dark border-t border-white/10 px-4 pb-4"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm text-slate-300 hover:text-white border-b border-white/5 last:border-0"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#voice-assistant"
              onClick={() => setMobileOpen(false)}
              className="btn-brand flex items-center justify-center gap-2 mt-4 px-5 py-2.5 text-sm w-full"
            >
              <Zap className="w-4 h-4" /> Start Speaking
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
