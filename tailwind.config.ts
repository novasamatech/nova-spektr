import headlessPlugin from '@headlessui/tailwindcss';
import { type Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import animatePlugin from 'tailwindcss-animate';

import colors from './tw-config-consts/colors';
import fontSizes from './tw-config-consts/font-sizes';

const tailwindConfig: Config = {
  mode: 'jit',
  content: ['./src/renderer/**/*.{html,js,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      width: {
        90: '22.5rem',
        modal: '27.5rem',
        'modal-sm': '23rem',
        'modal-lg': '49rem',
        'modal-xl': '59.625rem',
      },
      height: {
        modal: '36rem',
      },
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
        stack: 'var(--stack)',
        'stack-hover': 'var(--stack-hover)',
        'shadow-1': 'var(--shadow-1)',
        'shadow-2': 'var(--shadow-2)',
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
          8: 'rgba(0, 0, 0, 0.08)',
          12: 'rgba(0, 0, 0, 0.12)',
          32: 'rgba(0, 0, 0, 0.32)',
          40: 'rgba(0, 0, 0, 0.40)',
          48: 'rgba(0, 0, 0, 0.48)',
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
        13: '3.25rem',
        15: '3.75rem',
      },
      fontSize: fontSizes,
      borderRadius: {
        md: '4px',
        '2lg': '10px',
      },
      outlineOffset: {
        reduced: '-2px', // same as outline width, so it would be aligned by inner border of element
      },
      letterSpacing: {
        tight: '-.01em',
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90',
        100: '100',
      },
    },
  },
  plugins: [headlessPlugin, animatePlugin],
};

export default tailwindConfig;
