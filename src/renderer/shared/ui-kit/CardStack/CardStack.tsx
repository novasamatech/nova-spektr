import './CardStack.css';

import * as RadixAccordion from '@radix-ui/react-accordion';
import { animated, useSpring } from '@react-spring/web';
import {
  type PropsWithChildren,
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { useResizeObserver } from '../hooks/useResizeObserver';

const Context = createContext<{ open: boolean }>({ open: false });

type RootProps = PropsWithChildren<{
  initialOpen?: boolean;
}>;

const Root = ({ initialOpen = false, children }: RootProps) => {
  const id = useId();
  const [open, setOpen] = useState(initialOpen);

  const ctx = useMemo(() => ({ open }), [open]);

  const deferred = useDeferredValue(open);

  return (
    <Context.Provider value={ctx}>
      <RadixAccordion.Root
        collapsible
        type="single"
        value={deferred ? id : ''}
        onValueChange={value => setOpen(value === id)}
      >
        <RadixAccordion.Item value={id} className="group/stack card-stack rounded-md">
          {children}
        </RadixAccordion.Item>
      </RadixAccordion.Root>
    </Context.Provider>
  );
};

type TriggerProps = PropsWithChildren<{
  sticky?: boolean;
}>;

const Trigger = ({ sticky, children }: TriggerProps) => {
  const { open } = useContext(Context);

  return (
    <RadixAccordion.Header asChild>
      <div className={cnTw('card-stack-header-wrap relative z-10 block w-full', sticky && open && 'sticky top-2 z-10')}>
        {sticky && open && (
          <div className="card-stack-sticky-gap absolute -top-2 right-0 left-0 -z-10 h-4 w-full bg-top-nav-bar-background" />
        )}
        <RadixAccordion.Trigger
          className={cnTw(
            'card-stack-trigger group flex w-full cursor-pointer items-center gap-x-2 bg-row-background py-1 pr-2 pl-3',
            'shadow-stack outline-hidden! hover:shadow-stack-hover focus:shadow-stack-hover data-[state=open]:shadow-none',
            'transition-all duration-300',
            'data-[state=closed]:rounded-md data-[state=open]:rounded-t-md',
            'border-b border-transparent data-[state=open]:border-divider',
          )}
        >
          <Icon
            className={cnTw(
              'transition-all duration-100 group-data-[state=open]:rotate-90',
              'shrink-0 text-icon-default group-hover:text-icon-hover group-focus:text-icon-hover',
            )}
            name="shelfRight"
            size={16}
          />
          <div className="flex min-w-0 grow">{children}</div>
        </RadixAccordion.Trigger>
      </div>
    </RadixAccordion.Header>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  const { open } = useContext(Context);
  const [contentRef, setContentRef] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);

  useResizeObserver(contentRef, entry => {
    const height = entry.borderBoxSize.reduce((a, x) => a + x.blockSize, 0);
    setHeight(height);
  });

  const [mountContent, setMountContent] = useState(open);

  useEffect(() => {
    if (open) {
      setMountContent(true);
    }
  }, [open]);
  const springProps = useSpring({
    from: { height: 0, opacity: 0 },
    to: {
      height: open ? height : 0,
      opacity: open ? 1 : 0,
    },
    config: { tension: 210, friction: 20 },
    onResolve: result => {
      //i know this is a bloody hack, but it works just fine
      if (result.value['height'] === 0) {
        setMountContent(false);
      }
    },
  });

  return (
    <div className="relative min-h-1.5 overflow-hidden">
      <div
        className={cnTw(
          'card-stack-plate absolute top-0 left-1/2 h-full w-full -translate-x-1/2 rounded-b-md bg-card-background shadow-stack',
          'group-data-[state=open]/stack:shadow-none',
        )}
      />
      <RadixAccordion.Content asChild forceMount>
        <animated.div style={{ ...springProps, overflow: 'hidden' }}>
          <div ref={setContentRef}>
            <section className="card-stack-content relative">{mountContent ? children : null}</section>
          </div>
        </animated.div>
      </RadixAccordion.Content>
    </div>
  );
};

export const CardStack = Object.assign(Root, {
  Trigger,
  Content,
});
