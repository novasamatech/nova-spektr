const defaultTheme = require('tailwindcss/defaultTheme');

const colors = require('./colors');

module.exports = {
  mode: 'jit',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{js,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Public Sans', ...defaultTheme.fontFamily.sans],
        inter: ['Inter', ...defaultTheme.fontFamily.sans],
        manrope: ['Manrope', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        surface: '0 0 15px rgba(0, 0, 0, 0.05)',
        element: '0 0 5px rgba(0, 0, 0, 0.15)',
        component: '0 0 50px rgba(0, 0, 0, 0.1)',
        'icon-button': '0px 2px 2px rgba(0, 0, 0, 0.04), inset 0px -0.5px 0px rgba(8, 9, 14, 0.16)',
        'active-input': '0px 0px 0px 2px rgba(36, 99, 235, 0.16)',
        modal: '0px 2px 6px rgba(24, 24, 28, 0.06), 0px 32px 41px -23px rgba(24, 24, 28, 0.07)',
        'card-shadow': 'var(--card-shadow)',
        'knob-shadow': 'var(--knob-shadow)',
        'input-active-shadow': 'var(--input-active-shadow)',
      },
      colors: {
        primary: '#567CDC',
        'primary-variant': '#D5DEF6',
        'on-primary-variant': '#1A367F',
        secondary: '#A7DB57',
        'secondary-variant': '#E9F6D5',
        tertiary: '#262E42',
        'tertiary-variant': '#262E42',
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
        redesign: {
          shade: {
            8: 'rgba(0, 0, 0, 0.08)',
            12: 'rgba(0, 0, 0, 0.12)',
            32: 'rgba(0, 0, 0, 0.32)',
            40: 'rgba(0, 0, 0, 0.40)',
            48: 'rgba(0, 0, 0, 0.48)',
          },
        },
        ...colors,
      },
      spacing: {
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
        '3xs': ['0.5625rem', '0.6875rem'], // rename to something according to our typography system
        '2xs': ['0.625rem', '0.75rem'],
        '4.5xl': ['2.75rem', '3rem'],
        'large-title': ['1.625rem', '2.25rem'],
        title: ['1.375rem', '1.875rem'],
        'small-title': ['0.9375rem', '1.375rem'],
        'button-small': ['0.75rem', '1.125rem'],
        'button-large': ['0.875rem', '1.125rem'],
        caption: ['0.625rem', '0.75rem'], // 10 12
        headline: ['0.9375rem', '1.375rem'],
        body: ['0.8125rem', '1.125rem'],
        footnote: ['0.75rem', '1.125rem'],
        'modal-title': ['1.0625rem', '1.375rem'], // 17 22
        'help-text': ['0.625rem', '0.875rem'], // 10 14
      },
      borderRadius: {
        '2lg': '10px',
      },
      outlineOffset: {
        reduced: '-5px',
      },
      gridTemplateColumns: {
        'operation-card': '72px 196px 182px 130px 130px 40px',
      },
    },
  },
  plugins: [require('@headlessui/tailwindcss')],
};
