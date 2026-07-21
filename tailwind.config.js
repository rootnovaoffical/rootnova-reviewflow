/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        glass: {
          border: "rgba(255,255,255,0.12)",
          bg: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.10)",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out forwards",
        "page-enter": "page-enter 0.4s ease-out forwards",
        "stat-3d": "stat-3d 0.4s ease-out forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "page-enter": {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "stat-3d": {
          "0%": { opacity: "0", transform: "perspective(600px) rotateX(15deg) translateY(10px)" },
          "100%": { opacity: "1", transform: "perspective(600px) rotateX(0) translateY(0)" },
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 20px rgba(59,130,246,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(59,130,246,0.6)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "float": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
