import {
  type PropsWithChildren,
  type ReactNode,
  Children,
  cloneElement,
  isValidElement,
  useRef,
  useState,
} from 'react';

import { cnTw } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui';
import { Carousel, ScrollArea } from '@/shared/ui-kit';

type Props = {
  footer: ReactNode;
  count: number;
};

export const Root = ({ children, footer, count }: PropsWithChildren<Props>) => {
  const [currentTx, setCurrentTx] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const nextTx = () => {
    if (count && currentTx < count - 1) {
      const newValue = currentTx + 1;

      setCurrentTx(newValue);
    }
  };

  const previousTx = () => {
    if (currentTx > 0) {
      const newValue = currentTx - 1;

      setCurrentTx(newValue);
    }
  };

  const currentPage = currentTx + 1;

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <ScrollArea>
        <Carousel item={currentTx.toString()}>
          <div className="bg-background-default py-4" ref={scrollRef}>
            <div className="relative flex gap-2 first:ml-4" ref={ref}>
              {Children.map(children, (child, index) => {
                // @ts-expect-error __active prop is not typed
                return isValidElement(child) ? cloneElement(child, { __index: index }) : null;
              })}
            </div>
          </div>
        </Carousel>
      </ScrollArea>
      <div className="flex shrink-0 justify-between bg-white px-5 pt-3 pb-4">
        <div className="flex gap-2">
          <IconButton
            size={20}
            className="flex h-[42px] w-[42px] items-center justify-center border"
            name="left"
            disabled={currentPage === 0}
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
            disabled={currentPage === count}
            onClick={nextTx}
          />
        </div>

        {footer}
      </div>
    </div>
  );
};

type ItemProps = PropsWithChildren<{
  __index?: number;
}>;

export const Item = ({ __index = 0, children }: ItemProps) => {
  return (
    <Carousel.Item id={__index.toString()} index={__index}>
      <div className="flex h-[580px] shrink-0 flex-col last-of-type:pr-4">
        <div className="flex max-h-full w-full flex-col rounded-lg bg-white shadow-shadow-2">{children}</div>
      </div>
    </Carousel.Item>
  );
};

export const ConfirmSlider = Object.assign(Root, {
  Item,
});
