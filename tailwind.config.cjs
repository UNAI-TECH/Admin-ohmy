/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#E31E24",
        "primary-dark": "#93000d",
        "primary-light": "#ffb4ab",
        "bg-main": "#0b1326",
        "bg-container": "#131b2e",
        "bg-card": "#171f33",
        "bg-highest": "#2d3449",
      },
    },
  },
  plugins: [],
}
