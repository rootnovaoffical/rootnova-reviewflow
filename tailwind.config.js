/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81" },
        accent: { 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2" },
        success: { 400: "#4ade80", 500: "#22c55e", 600: "#16a34a" },
        warning: { 400: "#facc15", 500: "#eab308", 600: "#ca8a04" },
        error: { 400: "#f87171", 500: "#ef4444", 600: "#dc2626" },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "aurora": "aurora 8s ease-in-out infinite alternate",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { "0%": { opacity: "0", transform: "scale(0.95)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        shimmer: { "0%": { backgroundPosition: "-1000px 0" }, "100%": { backgroundPosition: "1000px 0" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-20px)" } },
        aurora: { "0%": { opacity: "0.3", transform: "scale(1) rotate(0deg)" }, "100%": { opacity: "0.6", transform: "scale(1.2) rotate(5deg)" } },
        pulseGlow: { "0%,100%": { boxShadow: "0 0 20px rgba(99,102,241,0.3)" }, "50%": { boxShadow: "0 0 40px rgba(99,102,241,0.6)" } },
      },
    },
  },
  plugins: [],
};
