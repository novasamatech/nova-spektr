import * as RadixAccordion from '@radix-ui/react-accordion';
import { type PropsWithChildren, createContext, useContext, useId, useMemo, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

import './Accordion.css';

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
        className="w-full"
        collapsible
        type="single"
        value={open ? id : ''}
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
  const { open } = useContext(Context);

  return (
    <RadixAccordion.Header asChild>
      <div className={cnTw('block w-full', sticky && 'sticky top-0 z-10')}>
        <RadixAccordion.Trigger
          className={cnTw(
            'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-caption uppercase text-text-secondary',
            'transition-colors duration-100 hover:bg-action-background-hover',
            sticky && 'bg-background-default',
          )}
        >
          <div className="flex min-w-0 grow gap-2 truncate text-start">{children}</div>
          <Icon
            className="shrink-0 text-icon-default transition-colors duration-100 group-hover:text-icon-hover"
            name={open ? 'up' : 'down'}
            size={16}
          />
        </RadixAccordion.Trigger>
      </div>
    </RadixAccordion.Header>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  return (
    <RadixAccordion.Content asChild>
      <section className="accordion-content w-full">{children}</section>
    </RadixAccordion.Content>
  );
};

export const Accordion = Object.assign(Root, {
  Trigger,
  Content,
});
