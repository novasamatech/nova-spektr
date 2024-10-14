import { type PropsWithChildren, type ReactNode, useRef, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui';
import { ScrollArea } from '@/shared/ui-kit';

type Props = {
  footer: ReactNode;
  count: number;
};

export const Root = ({ children, footer, count }: PropsWithChildren<Props>) => {
  const [currentTx, setCurrentTx] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (value: number) => {
    setTimeout(() =>
      // @ts-expect-error TS doesn't recognize offsetLeft
      scrollRef.current?.scrollTo({ left: ref.current?.childNodes[value].offsetLeft - 16, behavior: 'smooth' }),
    );
  };

  const nextTx = () => {
    if (count && currentTx < count - 1) {
      const newValue = currentTx + 1;

      setCurrentTx(newValue);
      scroll(newValue);
    }
  };

  const previousTx = () => {
    if (currentTx > 0) {
      const newValue = currentTx - 1;

      setCurrentTx(newValue);
      scroll(newValue);
    }
  };

  const currentPage = currentTx + 1;

  return (
    <>
      <div className="w-[478px] overflow-x-hidden bg-background-default py-4" ref={scrollRef}>
        <div className="flex gap-2 first:ml-4" ref={ref}>
          {children}
        </div>
      </div>
      <div className="flex justify-between rounded-lg bg-white px-5 pb-4 pt-3">
        <div className="flex gap-2">
          <IconButton
            size={20}
            className="flex h-[42px] w-[42px] items-center justify-center border"
            name="left"
            onClick={previousTx}
          />

          <div
            className={cnTw(
              'h-[42px] w-[77px] rounded-full border border-divider font-semibold',
              'flex items-center justify-center text-text-secondary',
              'shadow-shadow-1',
            )}
          >
            {currentPage}/{count}
          </div>

          <IconButton
            size={20}
            className="flex h-[42px] w-[42px] items-center justify-center border"
            name="right"
            onClick={nextTx}
          />
        </div>

        {footer}
      </div>
    </>
  );
};

export const Item = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex h-[582px] flex-col last-of-type:pr-4">
      <ScrollArea>
        <div className="flex max-h-full w-[440px] flex-col rounded-lg bg-white shadow-shadow-2">{children}</div>
      </ScrollArea>
    </div>
  );
};

export const ConfirmSlider = Object.assign(Root, {
  Item,
});
