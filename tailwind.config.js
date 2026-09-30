/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        land: { raw: '(orientation: landscape) and (min-width: 900px) and (min-height: 500px)' }
      },
      colors: {
        brand: {
          50: '#fff7ed',
          500: '#f97316',
          600: '#ea580c'
        }
      }
    }
  },
  plugins: []
};
