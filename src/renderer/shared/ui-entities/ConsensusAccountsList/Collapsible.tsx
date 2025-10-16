import './Collapsible.css';

import * as RadixAccordion from '@radix-ui/react-accordion';
import { type PropsWithChildren, createContext, useDeferredValue, useId, useMemo, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

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
      <div className={cnTw('block w-full', sticky && 'sticky top-0 z-10')}>
        <RadixAccordion.Trigger
          className={cnTw(
            'group flex w-full cursor-pointer items-center gap-2 rounded-md text-caption text-text-secondary',
            'transition-colors duration-100 hover:bg-block-background-hover',
            sticky && 'bg-block-background-default',
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
          <div className="flex min-w-0 grow truncate">{children}</div>
        </RadixAccordion.Trigger>
      </div>
    </RadixAccordion.Header>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  return (
    <RadixAccordion.Content asChild>
      <section className="collapsible-content w-full">{children}</section>
    </RadixAccordion.Content>
  );
};

export const Collapsible = Object.assign(Root, {
  Trigger,
  Content,
});
