/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#123B4A',
          teal: '#087E83',
          green: '#16845B',
          amber: '#B7791F',
          red: '#B54747',
          bg: '#F6F8F9',
        }
      }
    },
  },
  plugins: [],
}