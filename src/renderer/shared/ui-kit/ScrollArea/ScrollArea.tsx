import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import { type ComponentProps, type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type NativeProps = Pick<ComponentProps<'div'>, 'onScroll'>;

type Props = PropsWithChildren<
  NativeProps & {
    orientation?: 'vertical' | 'horizontal';
  }
>;

export const ScrollArea = ({ orientation = 'vertical', children, onScroll }: Props) => (
  <RadixScrollArea.Root type="scroll" scrollHideDelay={500} className="flex h-full w-full flex-col overflow-hidden">
    <RadixScrollArea.Viewport className="h-full w-full" onScroll={onScroll}>
      {children}
    </RadixScrollArea.Viewport>
    <RadixScrollArea.Scrollbar
      className={cnTw(
        'flex touch-none select-none border-transparent p-[1px] transition-all duration-300 animate-in fade-in hover:border-[--scrollbar-border] hover:bg-[--scrollbar-bg]',
        {
          'border-l hover:px-[3px]': orientation === 'vertical',
          'border-t hover:py-[3px]': orientation === 'horizontal',
        },
      )}
      orientation={orientation}
    >
      <RadixScrollArea.Thumb
        className="relative flex-shrink rounded-full bg-[--scrollbar-thumb-bg] after:absolute after:-inset-1.5 after:block"
        style={{
          [orientation === 'vertical' ? '--radix-scroll-area-thumb-width' : '--radix-scroll-area-thumb-height']:
            gridSpaceConverter(1.5) + 'px',
        }}
      />
    </RadixScrollArea.Scrollbar>
  </RadixScrollArea.Root>
);
