/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#050507",
        card: "#141414",
        card2: "#171717",
        border: "#262626",
        accent: {
          DEFAULT: "#00e095",
          dark: "#00c17f",
        },
        glow: {
          cyan: "#00F5FF",
          violet: "#8B5CF6",
        },
        muted: "#8a8a8a",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.4)",
        card: "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
      },
      borderRadius: {
        xl: "0.85rem",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.4 },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        marqueeReverse: {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0%)" },
        },
        blinkCursor: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        marquee: "marquee 20s linear infinite",
        marqueeReverse: "marqueeReverse 22s linear infinite",
        blinkCursor: "blinkCursor 0.9s step-end infinite",
      },
    },
  },
  plugins: [],
};
