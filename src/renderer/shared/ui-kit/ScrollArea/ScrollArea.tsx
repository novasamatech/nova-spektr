import './ScrollArea.css';

import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import {
  type CSSProperties,
  type ComponentProps,
  type PropsWithChildren,
  type UIEventHandler,
  memo,
  useState,
} from 'react';

import { cnTw } from '@/shared/lib/utils';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type NativeProps = Pick<ComponentProps<'div'>, 'onScroll'>;

type Props = PropsWithChildren<
  NativeProps & {
    orientation?: 'vertical' | 'horizontal';
  }
>;

export const ScrollArea = memo(({ orientation = 'vertical', children, onScroll }: Props) => {
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const handlerScroll: UIEventHandler<HTMLDivElement> = e => {
    setShowTopFade(e.currentTarget.scrollTop > 0);
    setShowBottomFade(e.currentTarget.scrollTop + e.currentTarget.clientHeight < e.currentTarget.scrollHeight);

    if (onScroll) {
      onScroll(e);
    }
  };

  const style = {
    '--scroll-area-top-fade': showTopFade && '4px',
    '--scroll-area-bottom-fade': showBottomFade && '4px',
  };

  return (
    <RadixScrollArea.Root type="scroll" scrollHideDelay={500} className="flex h-full w-full flex-col overflow-hidden">
      <RadixScrollArea.Viewport
        className="scrollArea h-full w-full"
        style={style as CSSProperties}
        onScroll={handlerScroll}
      >
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
});
