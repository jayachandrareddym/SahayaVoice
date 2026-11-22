/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#04071a",
          900: "#080d2e",
          800: "#0d1545",
          700: "#131e5c",
        },
        brand: {
          indigo: "#6366f1",
          violet: "#7c3aed",
          purple: "#9333ea",
          cyan:   "#06b6d4",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-mesh":
          "radial-gradient(at 40% 20%, hsla(240,100%,20%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(263,100%,25%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(220,100%,15%,1) 0px, transparent 50%)",
        "gradient-brand":
          "linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #9333ea 100%)",
        "gradient-cta":
          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      },
      animation: {
        "pulse-slow":    "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow":     "spin 8s linear infinite",
        "float":         "float 6s ease-in-out infinite",
        "glow":          "glow 2s ease-in-out infinite alternate",
        "wave":          "wave 1.5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        glow: {
          from: { boxShadow: "0 0 20px 4px rgba(99,102,241,0.3)" },
          to:   { boxShadow: "0 0 40px 8px rgba(124,58,237,0.5)" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.5)" },
          "50%":      { transform: "scaleY(1.5)" },
        },
      },
      boxShadow: {
        glass:  "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        brand:  "0 8px 32px rgba(99, 102, 241, 0.4)",
        "brand-lg": "0 16px 48px rgba(99, 102, 241, 0.5)",
      },
    },
  },
  plugins: [],
};
