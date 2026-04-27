/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        guardian: {
          950: '#050816',
          900: '#0b1020',
          800: '#111827',
          500: '#38bdf8',
          400: '#7dd3fc',
        },
      },
    },
  },
  plugins: [],
}
