// ────────────────────────────────────────────────────────────
// Design tokens for AudioSnap — a near-black canvas with a
// spectrogram-inspired accent gradient (violet → cyan → amber), the
// same color logic audio analysis tools use to plot frequency
// intensity. Reserve `spectrum` for the signature waveform/progress
// elements only; everyday UI accents use `cyan`.
// ────────────────────────────────────────────────────────────
const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0B10",
        surface: "#10121A",
        glass: {
          DEFAULT: "rgba(255,255,255,0.045)",
          border: "rgba(255,255,255,0.09)",
          hover: "rgba(255,255,255,0.07)",
        },
        ink: {
          DEFAULT: "#F4F6FB",
          muted: "#8B95A7",
          faint: "#5A6275",
        },
        cyan: {
          DEFAULT: "#22D3EE",
          dim: "#0E7490",
        },
        violet: "#7C3AED",
        amber: "#FACC15",
        success: "#34D399",
        danger: "#F87171",
      },
      backgroundImage: {
        spectrum: "linear-gradient(90deg, #7C3AED 0%, #22D3EE 55%, #FACC15 100%)",
        "spectrum-radial": "radial-gradient(circle at 30% 20%, rgba(124,58,237,0.25), transparent 60%)",
      },
      fontFamily: {
        display: ["var(--font-display)", ...fontFamily.sans],
        sans: ["var(--font-body)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },
      backdropBlur: {
        glass: "20px",
      },
      keyframes: {
        "bar-pulse": {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "bar-pulse": "bar-pulse 1.4s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out forwards",
        shimmer: "shimmer 1.6s linear infinite",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
