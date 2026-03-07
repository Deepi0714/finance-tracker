/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: 'rgba(255,255,255,0.05)',
          hover:   'rgba(255,255,255,0.08)',
          border:  'rgba(255,255,255,0.08)',
        },
      },
    },
  },
  plugins: [],
};
