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
        'shadow-primary': '0 4px 4px rgba(69, 69, 137, 0.12), 0 -0.5px 0 rgba(69, 69, 137, 0.04)',
        'shadow-secondary': '0 4px 6px rgba(69, 69, 137, 0.12), 0 -0.5px 0 rgba(69, 69, 137, 0.06)',
      },
      colors,
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
