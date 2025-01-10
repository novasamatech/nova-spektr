// This is the only one place of import.
// eslint-disable-next-line no-restricted-imports
import cn from 'classnames';
import { extendTailwindMerge } from 'tailwind-merge';

import additionalColors from '../../../../../tw-config-consts/colors';
import fontSizes from '../../../../../tw-config-consts/font-sizes';

type CnArgs = Parameters<typeof cn>;

const fonts = Object.keys(fontSizes as Record<string, unknown>);
const colors = Object.keys(additionalColors as Record<string, unknown>);

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      w: [{ w: ['90', '92', 'modal', 'modal-sm', 'modal-xl'] }],
      h: [{ h: ['modal'] }],
      'font-size': [{ text: fonts }],
      'font-weight': [{ text: fonts }],
      leading: [{ text: fonts }],
      tracking: [{ text: fonts }],
      'bg-color': [{ bg: colors }],
      'text-color': [{ text: colors }],
      'border-color': [{ border: colors }],
    },
  },
});

/**
 * Merge CSS classes use Tailwind Merge internally to overcome Tailwind styling
 * cascade
 *
 * @param args List of arguments for <b>cn</b>
 *
 * @returns {String}
 */
export const cnTw = (...args: CnArgs): string => twMerge(cn(args));
