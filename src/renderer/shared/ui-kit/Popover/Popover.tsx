import * as RadixPopover from '@radix-ui/react-popover';
import { noop } from 'lodash';
import { type PropsWithChildren, type ReactNode, createContext, useCallback, useContext, useMemo } from 'react';

import { type XOR } from '@/shared/core';
import { useToggle } from '../../lib/hooks';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type ContextProps = {
  isOpen?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  testId?: string;
  close?: VoidFunction;
};

const Context = createContext<ContextProps>({ close: noop });

type ControlledPopoverProps = XOR<{
  open: boolean;
  onToggle: (value: boolean) => void;
}>;

type RootProps = ControlledPopoverProps &
  ContextProps & {
    dialog?: boolean;
    children: ((params: { open: boolean; close: VoidFunction }) => ReactNode) | ReactNode;
  };
const Root = ({
  dialog,
  open,
  onToggle,
  side = 'bottom',
  sideOffset = 2,
  align = 'center',
  alignOffset = 0,
  testId = 'Popover',
  children,
}: RootProps) => {
  const [isOpen, toggleIsOpen] = useToggle(open);

  const ctx = useMemo(
    () => ({ isOpen, side, sideOffset, align, alignOffset, testId, close }),
    [isOpen, side, sideOffset, align, alignOffset, testId, close],
  );

  const openChange = useCallback(
    (isOpen: boolean) => {
      onToggle?.(isOpen);
      toggleIsOpen();
    },
    [onToggle],
  );

  return (
    <Context.Provider value={ctx}>
      <RadixPopover.Root modal={!dialog} open={isOpen} onOpenChange={openChange}>
        {typeof children === 'function' ? children({ open: Boolean(isOpen), close: toggleIsOpen }) : children}
      </RadixPopover.Root>
    </Context.Provider>
  );
};

const Trigger = ({ children }: PropsWithChildren) => {
  return <RadixPopover.Trigger asChild>{children}</RadixPopover.Trigger>;
};

const Anchor = ({ children }: PropsWithChildren) => {
  return <RadixPopover.Anchor asChild>{children}</RadixPopover.Anchor>;
};

const Content = ({ children }: PropsWithChildren) => {
  const { portalContainer } = useTheme();
  const { align, alignOffset, side, sideOffset, testId } = useContext(Context);

  return (
    <RadixPopover.Portal container={portalContainer}>
      <RadixPopover.Content
        asChild
        hideWhenDetached
        side={side}
        align={align}
        collisionPadding={gridSpaceConverter(2)}
        alignOffset={alignOffset && gridSpaceConverter(alignOffset)}
        sideOffset={sideOffset && gridSpaceConverter(sideOffset)}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-md border border-token-container-border bg-block-background-default shadow-shadow-2 duration-100 animate-in fade-in zoom-in-95">
          {children}
        </div>
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
};

export const Popover = Object.assign(Root, {
  Trigger,
  Anchor,
  Content,
});
