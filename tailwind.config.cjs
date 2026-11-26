/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#D4191F',
          deepCrimson: '#9E1111',
          bg: '#F5F5F7',
          sidebar: '#141414',
          card: '#FFFFFF',
          border: '#E5E7EB',
          divider: '#F0F1F5',
          text: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          success: '#059669',
          warning: '#D97706',
          info: '#2563EB',
          redLight: 'rgba(212, 25, 31, 0.14)',
          redUltraLight: 'rgba(212, 25, 31, 0.06)'
        }
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        outfit: ['"Outfit"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
