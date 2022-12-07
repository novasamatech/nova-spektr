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
        surface: '0 0 15px rgba(0, 0, 0, 0.05)',
        element: '0 0 5px rgba(0, 0, 0, 0.15)',
        component: '0 0 50px rgba(0, 0, 0, 0.1)',
      },
      colors: {
        primary: '#567CDC',
        'primary-variant': '#D5DEF6',
        secondary: '#A7DB57',
        'secondary-variant': '#E9F6D5',
        tertiary: '#262E42',
        neutral: '#333333',
        'neutral-variant': '#666666',
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
      gridTemplateColumns: {
        'max-full': 'max-content 1fr',
      },
      spacing: {
        0.5: '0.125rem',
        1.25: '0.3125rem',
        2.5: '0.625rem',
        3.5: '0.875rem',
        4.5: '1.125rem',
        5.5: '1.375rem',
        6.5: '1.625rem',
        7.5: '1.875rem',
        8.5: '2.125rem',
        9.5: '2.375rem',
        10.5: '2.625rem',
        11.5: '2.875rem',
        12.5: '3.125rem',
        15: '3.75rem',
      },
      fontSize: {
        '2xs': ['0.625rem', '0.75rem'],
        '4.5xl': ['2.75rem', '3rem'],
      },
      borderRadius: {
        '2lg': '10px',
      },
      outlineOffset: {
        reduced: '-5px',
      },
    },
  },
  plugins: [],
};
