import type { Config } from 'tailwindcss';

import fontSizes from './tw-config-consts/font-sizes';
import colors from './tw-config-consts/colors';

const defaultTheme = require('tailwindcss/defaultTheme');

export default {
  mode: 'jit',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{js,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
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
        'card-shadow-level2': 'var(--card-shadow-level2)',
      },
      colors: {
        // TODO: delete other shades - [Colors redesign] https://app.clickup.com/t/85ztnpw40
        shade: {
          5: '#F1F1F1',
          40: '#989898',
          70: '#4C4C4C',
          100: '#000000',
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
      fontSize: fontSizes,
      padding: {
        '1.5b': '5px',
        '2b': '7px',
        '3b': '11px',
        '4b': '15px',
        '5b': '19px',
      },
      borderRadius: {
        '2lg': '10px',
      },
      outlineOffset: {
        reduced: '-2px', // same as outline width, so it would be aligned by inner border of element
      },
      gridTemplateColumns: {
        'operation-card': '72px 182px 182px 130px 130px',
      },
      letterSpacing: {
        tight: '-.01em',
      },
    },
  },
  plugins: [require('@headlessui/tailwindcss')],
} satisfies Config;
