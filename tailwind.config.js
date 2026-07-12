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
