import * as RadixAccordion from '@radix-ui/react-accordion';
import { type PropsWithChildren, createContext, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

import './CardStack.css';

const Context = createContext<{ open: boolean }>({ open: false });

type RootProps = PropsWithChildren<{
  initialOpen?: boolean;
}>;

const Root = ({ initialOpen = false, children }: RootProps) => {
  const id = useId();
  const [open, setOpen] = useState(initialOpen);

  const ctx = useMemo(() => ({ open }), [open]);

  return (
    <Context.Provider value={ctx}>
      <RadixAccordion.Root
        collapsible
        type="single"
        value={open ? id : ''}
        onValueChange={(value) => setOpen(value === id)}
      >
        <RadixAccordion.Item value={id}>{children}</RadixAccordion.Item>
      </RadixAccordion.Root>
    </Context.Provider>
  );
};

type TriggerProps = PropsWithChildren<{
  sticky?: boolean;
}>;

const Trigger = ({ sticky, children }: TriggerProps) => {
  return (
    <RadixAccordion.Header asChild>
      <div className={cnTw('relative z-10 block w-full', sticky && 'sticky top-0 z-10')}>
        <RadixAccordion.Trigger
          className={cnTw(
            'group flex w-full items-center gap-x-2 bg-row-background py-1 pl-3 pr-2',
            'shadow-stack hover:shadow-stack-hover focus:shadow-stack-hover data-[state=open]:shadow-none',
            'transition-all duration-300 data-[state=closed]:rounded-md data-[state=open]:rounded-t-md',
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
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || !contentRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const { clientHeight } = ref.current!;

      contentRef.current!.style.cssText = `--radix-accordion-content-height: ${clientHeight}px;`;
    });

    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <RadixAccordion.Content forceMount ref={contentRef} className="card-stack-content group relative overflow-hidden">
      <div
        className={cnTw(
          'card-stack-plate absolute left-1/2 top-0 h-full w-full -translate-x-1/2 rounded-b-md bg-white shadow-stack',
          'group-data-[state=open]:border-t group-data-[state=open]:border-divider group-data-[state=open]:shadow-none',
        )}
      />
      <section ref={ref} className="card-stack-section relative">
        {children}
      </section>
    </RadixAccordion.Content>
  );
};

export const CardStack = Object.assign(Root, {
  Trigger,
  Content,
});
