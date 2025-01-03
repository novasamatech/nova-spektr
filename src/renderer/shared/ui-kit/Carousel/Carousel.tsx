import { animated, easings, useTransition } from '@react-spring/web';
import { isObject } from 'lodash';
import { Children, type PropsWithChildren, createContext, memo, useContext, useState } from 'react';

import { usePrevious } from '@/shared/lib/hooks';
import { nonNullable } from '@/shared/lib/utils';
import { useResizeObserver } from '../hooks/useResizeObserver';

type ContextProps = {
  item: string;
  items: string[];
  direction: number;
  setItem: (item: string) => unknown;
};

const Context = createContext<ContextProps>({
  item: '',
  items: [],
  direction: 0,
  setItem: () => {},
});

type RootProps = PropsWithChildren<{
  item: string;
  onNext?: (item: string) => unknown;
  onPrev?: (item: string) => unknown;
  onItemChange?: (item: string) => unknown;
}>;

const Root = memo(({ children, item, onNext, onPrev, onItemChange }: PropsWithChildren<RootProps>) => {
  const prevItem = usePrevious(item);

  const items = Children.toArray(children).reduce<string[]>((items, child) => {
    if (nonNullable(child) && isObject(child) && 'type' in child && child.type === Item) {
      items.push(child.props.id);
    }

    return items;
  }, []);

  const itemIndex = items.indexOf(item);
  const prevItemIndex = items.indexOf(prevItem);
  const direction = itemIndex - prevItemIndex;

  const setItem = (nextItem: string) => {
    if (item === nextItem) {
      return;
    }

    const itemIndex = items.indexOf(item);
    const selectedItemIndex = items.indexOf(item);
    const nextDirection = selectedItemIndex - itemIndex;

    onItemChange?.(nextItem);
    if (nextDirection > 0) {
      onNext?.(item);
    }
    if (nextDirection < 0) {
      onPrev?.(item);
    }
  };

  return (
    <Context.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        direction,
        item,
        items,
        setItem,
      }}
    >
      <AnimatedResizableBlock>{children}</AnimatedResizableBlock>
    </Context.Provider>
  );
});

type ItemProps = PropsWithChildren<{
  id: string;
}>;

const Item = memo(({ id, children }: ItemProps) => {
  const { item, direction } = useContext(Context);

  const offset = 25;
  const transitions = useTransition(id === item, {
    initial: { opacity: 1, transform: 'translateX(0%)' },
    from: {
      opacity: 0,
      transform: `translateX(${direction > 0 ? offset : offset * -1}%)`,
    },
    enter: { opacity: 1, transform: 'translateX(0%)' },
    leave: {
      opacity: 0,
      top: 0,
      left: 0,
      transform: `translateX(${direction > 0 ? offset * -1 : offset}%)`,
      position: 'absolute',
    },
    config: {
      duration: 200,
      easing: easings.easeInOutSine,
    },
  });

  return transitions((styles, item) =>
    item ? (
      <animated.section className="relative min-h-full w-full" style={styles}>
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
