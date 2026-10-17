/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0B0E14',
          surface: '#121824',
          surfaceHover: '#182234',
          border: '#1F293D',
          borderLight: '#2D3B55',
          cyan: '#00F0FF',
          green: '#00E676',
          red: '#FF1744',
          gold: '#F59E0B',
          purple: '#A855F7',
          textMuted: '#94A3B8',
          textBright: '#F8FAFC'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
