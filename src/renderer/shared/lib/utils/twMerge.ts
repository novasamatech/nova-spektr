import cn from 'classnames';
import { extendTailwindMerge } from 'tailwind-merge';

import fontSizes from '../../../../../tw-config-consts/font-sizes';

type CnArgs = Parameters<typeof cn>;

const fonts = Object.keys(fontSizes as { [key: string]: object });

const twMerge = extendTailwindMerge({
  classGroups: {
    'font-size': [
      {
        text: fonts,
      },
    ],
  },
});

/**
 * Merge CSS classes use Tailwind Merge internally to
 * overcome Tailwind styling cascade
 *
 * @param args List of arguments for <b>cn</b>
 *
 * @returns {String}
 */
export const cnTw = (...args: CnArgs): string => twMerge(cn(args));
