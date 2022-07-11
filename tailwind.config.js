const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  mode: 'jit',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{js,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Public Sans', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: '#0070f3',
        'primary-variant': '#D5DEF6',
        secondary: '#A7DB57',
        'secondary-variant': '#E9F6D5',
        tertiary: '#262E42',
        shadow: {
          1: 'rgba(0, 0, 0, 0.01)',
          2: 'rgba(0, 0, 0, 0.02)',
          5: 'rgba(0, 0, 0, 0.05)',
          10: 'rgba(0, 0, 0, 0.1)',
          20: 'rgba(0, 0, 0, 0.2)',
          30: 'rgba(0, 0, 0, 0.3)',
          40: 'rgba(0, 0, 0, 0.4)',
          50: 'rgba(0, 0, 0, 0.5)',
          60: 'rgba(0, 0, 0, 0.6)',
          70: 'rgba(0, 0, 0, 0.7)',
          80: 'rgba(0, 0, 0, 0.8)',
          90: 'rgba(0, 0, 0, 0.9)',
          100: 'rgba(0, 0, 0, 1)',
        },
      },
      spacing: {
        5.5: '1.375rem',
        9.5: '2.375rem',
      },
    },
  },
  plugins: [],
};
