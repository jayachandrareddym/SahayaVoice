/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        line: token("line"),
        ink: token("ink"),
        muted: token("muted"),
        accent: token("accent"),
        "accent-ink": token("accent-ink"),
        violet: token("violet"),
        teal: token("teal"),
        success: token("success"),
        danger: token("danger"),
        paper: token("paper"),
        "paper-ink": token("paper-ink"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-kn)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        kn: ["var(--font-kn)", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--accent) / 0.25), 0 10px 40px -10px rgb(var(--accent) / 0.55)",
        card: "0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 20px 50px -24px rgb(0 0 0 / 0.45)",
        paper: "0 30px 60px -30px rgb(0 0 0 / 0.45), 0 2px 6px rgb(0 0 0 / 0.08)",
      },
      keyframes: {
        aurora: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(6%, -8%, 0) scale(1.12)" },
          "66%": { transform: "translate3d(-8%, 6%, 0) scale(0.94)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        eq: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        caret: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
      },
      animation: {
        aurora: "aurora 22s ease-in-out infinite",
        "aurora-slow": "aurora 34s ease-in-out infinite reverse",
        shimmer: "shimmer 2.2s linear infinite",
        "spin-slow": "spin-slow 14s linear infinite",
        eq: "eq 0.9s ease-in-out infinite",
        caret: "caret 1s steps(1) infinite",
      },
    },
  },
  plugins: [],
};
