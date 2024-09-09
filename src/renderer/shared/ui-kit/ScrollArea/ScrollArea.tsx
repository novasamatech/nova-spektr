import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import { type PropsWithChildren } from 'react';

import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type Props = PropsWithChildren<{
  orientation?: 'vertical' | 'horizontal';
}>;

export const ScrollArea = ({ orientation = 'vertical', children }: Props) => (
  <RadixScrollArea.Root scrollHideDelay={150} className="flex h-full w-full flex-col overflow-hidden">
    <RadixScrollArea.Viewport className="h-full w-full">{children}</RadixScrollArea.Viewport>
    <RadixScrollArea.Scrollbar
      className="flex touch-none select-none bg-[--scrollbar-bg] p-0.5 transition-colors duration-100 animate-in fade-in hover:bg-[--scrollbar-bg-hover]"
      orientation={orientation}
    >
      <RadixScrollArea.Thumb
        className="relative flex-shrink rounded-full bg-[--scrollbar-thumb-bg]"
        style={{
          [orientation === 'vertical' ? '--radix-scroll-area-thumb-width' : '--radix-scroll-area-thumb-height']:
            gridSpaceConverter(1.5) + 'px',
        }}
      />
    </RadixScrollArea.Scrollbar>
  </RadixScrollArea.Root>
);
