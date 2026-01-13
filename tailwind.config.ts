import headlessPlugin from '@headlessui/tailwindcss';
import { type Config } from 'tailwindcss/dist/lib.mjs';
import animatePlugin from 'tailwindcss-animate';

import colors from './tw-config-consts/colors';
import fontSizes from './tw-config-consts/font-sizes';

const tailwindConfig: Config = {
  content: ['./src/renderer/**/*.{html,js,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      width: {
        90: '22.5rem',
        92: '23rem',
        modal: '27.5rem',
        'modal-sm': '23rem',
        'modal-lg': '49rem',
        'modal-xl': '59rem',
        'modal-xxl': '69rem',
      },
      height: {
        modal: '36rem',
      },
      colors: colors,
      fontSize: fontSizes,
      outlineOffset: {
        reduced: '-2px', // same as outline width, so it would be aligned by inner border of element
      },
    },
  },
  plugins: [headlessPlugin, animatePlugin],
};

export default tailwindConfig;
