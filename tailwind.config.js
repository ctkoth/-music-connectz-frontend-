/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Music ConnectZ neon palette — matches the artifact's T constants
        mcz: {
          purple: '#a855f7',
          cyan: '#22d3ee',
          pink: '#ec4899',
          orange: '#f97316',
          lime: '#84cc16',
          yellow: '#facc15',
          red: '#ef4444',
          green: '#10b981',
          bgDeep: '#0a0118',
          bgMid: '#1a0b2e',
        },
      },
      fontFamily: {
        ui: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['Audiowide', 'cursive'],
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
