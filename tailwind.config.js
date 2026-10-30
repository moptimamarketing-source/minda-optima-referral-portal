/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/**/*.html',
    './web-src/**/*.html',
    './public/**/*.js',
    './web-src/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0D2A5C', light: '#1B4A94', dark: '#081B3D' },
        gold: { DEFAULT: '#FFB800', light: '#FFE08A', dark: '#C98F00' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
