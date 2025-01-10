import { animated, useTransition } from '@react-spring/web';
import { type PropsWithChildren, createContext, memo, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { usePrevious } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { defaultEasing } from '../_helpers/easing';
import { useResizeObserver } from '../hooks/useResizeObserver';

type ContextProps = {
  item: string;
  direction: number;
  fixedHeight: boolean;
  registerItem: (id: string, index: number) => void;
};

const Context = createContext<ContextProps>({
  fixedHeight: false,
  item: '',
  direction: 0,
  registerItem: () => {},
});

type RootProps = PropsWithChildren<{
  item: string;
  fixedHeight?: boolean;
}>;

const Root = memo(({ children, fixedHeight = false, item }: PropsWithChildren<RootProps>) => {
  const prevItem = usePrevious(item);
  const indecies = useRef<Record<string, number>>({});

  const itemIndex = indecies.current[item] ?? 0;
  const prevItemIndex = indecies.current[prevItem] ?? 0;
  const direction = itemIndex - prevItemIndex;

  const value = useMemo(() => {
    return {
      item,
      direction,
      fixedHeight,
      registerItem: (id: string, index: number) => {
        indecies.current[id] = index;
      },
    };
  }, [direction, item, fixedHeight]);

  return (
    <Context.Provider value={value}>
      {fixedHeight ? children : <AnimatedResizableBlock>{children}</AnimatedResizableBlock>}
    </Context.Provider>
  );
});

type ItemProps = PropsWithChildren<{
  id: string;
  index: number;
}>;

const Item = memo(({ id, index, children }: ItemProps) => {
  const { item, direction, fixedHeight, registerItem } = useContext(Context);

  useEffect(() => {
    registerItem(id, index);
  }, [id, index]);

  const offset = 25;
  const transitions = useTransition(id === item, {
    initial: { opacity: 1, transform: 'translateX(0%)' },
    from: {
      opacity: 0,
      transform: `translateX(${direction > 0 ? offset : offset * -1}%)`,
    },
    enter: { opacity: 1, transform: 'translateX(0%)' },
    leave: {
      top: 0,
      left: 0,
      opacity: 0,
      transform: `translateX(${direction > 0 ? offset * -1 : offset}%)`,
      position: 'absolute',
    },
    config: {
      duration: 200,
      easing: defaultEasing,
    },
  });

  return transitions((styles, item) =>
    item ? (
      <animated.section
        className={cnTw('relative min-h-full w-full', fixedHeight && 'h-full overflow-hidden')}
        style={styles}
      >
        {children}
      </animated.section>
    ) : null,
  );

  return null;
});

const AnimatedResizableBlock = ({ children }: PropsWithChildren) => {
  const [height, setHeight] = useState<number | string>('auto');
  const [ref, setRef] = useState<HTMLElement | null>(null);

  useResizeObserver(ref, resizeEntity => {
    const height = resizeEntity.borderBoxSize.reduce((a, x) => a + x.blockSize, 0);

    setHeight(height);
  });

  return (
    <section
      className="relative min-h-full w-full overflow-hidden transition-all duration-200 ease-in-out contain-inline-size"
      style={{ height }}
    >
      <div ref={setRef}>{children}</div>
    </section>
  );
};

const Carousel = Object.assign(Root, {
  Item,
});

export { Carousel };
