const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  mode: 'jit',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{js,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Public Sans', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        1: '0 0 25px rgba(0, 0, 0, 0.05)',
      },
      height: {
        stretch: 'calc(100vh - 44px)',
      },
      colors: {
        primary: '#567CDC',
        'primary-variant': '#D5DEF6',
        secondary: '#A7DB57',
        'secondary-variant': '#E9F6D5',
        tertiary: '#262E42',
        success: '#55BA4C',
        alert: '#FFBF1A',
        error: '#C05941',
        'error-variant': '#EBD0CA',
        shade: {
          1: '#FCFCFC',
          2: '#F9F9F9',
          5: '#F1F1F1',
          10: '#E5E5E5',
          20: '#CBCBCB',
          30: '#B2B2B2',
          40: '#989898',
          50: '#7F7F7F',
          60: '#666666',
          70: '#4C4C4C',
          80: '#333333',
          90: '#191919',
          100: '#000000',
        },
      },
      spacing: {
        5.5: '1.375rem',
        9.5: '2.375rem',
      },
      backgroundImage: {
        stripes: "url('/src/renderer/assets/images/misc/stripes.png')",
      },
      outlineOffset: {
        reduced: '-5px',
      },
    },
  },
  plugins: [],
};
