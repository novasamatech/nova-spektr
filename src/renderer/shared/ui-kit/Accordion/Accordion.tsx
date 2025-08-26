import './Accordion.css';

import * as RadixAccordion from '@radix-ui/react-accordion';
import { type PropsWithChildren, createContext, useContext, useDeferredValue, useId, useMemo } from 'react';

import { useExternalState } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

const Context = createContext<{ open: boolean }>({ open: false });

type RootProps = PropsWithChildren<{
  initialOpen?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => unknown;
}>;

const Root = ({ initialOpen = false, open: externalOpen, onToggle, children }: RootProps) => {
  const id = useId();
  const [open, setOpen] = useExternalState(initialOpen || externalOpen, onToggle);
  const deferred = useDeferredValue(open);
  const ctx = useMemo(() => ({ open: open ?? false }), [open]);

  return (
    <Context.Provider value={ctx}>
      <RadixAccordion.Root
        className="w-full"
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
  const { open } = useContext(Context);

  return (
    <RadixAccordion.Header asChild>
      <div className={cnTw('block w-full', sticky && 'sticky top-0 z-10')}>
        <RadixAccordion.Trigger
          className={cnTw(
            'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-caption text-text-secondary uppercase',
            'transition-colors duration-100 hover:bg-action-background-hover',
            sticky && 'bg-background-default',
          )}
        >
          <div className="flex min-w-0 grow items-center gap-2 truncate text-start">{children}</div>
          <Icon
            className={cnTw(
              'shrink-0 scale-y-100 text-icon-default transition-all duration-150 group-hover:text-icon-hover',
              open && '-scale-y-100',
            )}
            name="down"
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
