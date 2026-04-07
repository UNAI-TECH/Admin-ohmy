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
          red: '#E8462A',
          bg: '#F5F6FA',
          sidebar: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E8EAF0',
          divider: '#F0F1F5',
          text: '#0F1117',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          success: '#059669',
          warning: '#D97706',
          info: '#2563EB',
          redLight: 'rgba(232, 70, 42, 0.08)',
          redUltraLight: 'rgba(232, 70, 42, 0.04)'
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
