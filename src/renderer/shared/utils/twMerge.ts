import cn from 'classnames';
import { extendTailwindMerge } from 'tailwind-merge';

import fontSizes from '../../../../tw-config-consts/font-sizes';

type CnArgs = Parameters<typeof cn>;

const twMerge = extendTailwindMerge({
  classGroups: {
    'font-size': [
      {
        text: Object.keys(fontSizes),
      },
    ],
  },
});
const cnTw = (...args: CnArgs) => twMerge(cn(args));
export default cnTw;
