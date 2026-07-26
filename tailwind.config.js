/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        mcz: {
          bg: "#07060d",
          panel: "#0e0b1a",
          pink: "#ff2bd1",
          cyan: "#22e6ff",
          purple: "#a855f7",
          gold: "#ffcf3f",
          // RepostExchange-inspired flat surfaces + single orange accent.
          ember: "#ff5500",
          ink: "#141414",
          card: "#1e1e1e",
        },
      },
      boxShadow: {
        neon: "0 0 18px rgba(255,43,209,0.45), 0 0 32px rgba(34,230,255,0.25)",
      },
      fontFamily: {
        display: ["Poppins", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
