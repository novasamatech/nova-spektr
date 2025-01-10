import * as RadixPopover from '@radix-ui/react-popover';
import { type PropsWithChildren, createContext, useContext, useMemo } from 'react';

import { type XOR } from '@/shared/core';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type ContextProps = {
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  testId?: string;
};

const Context = createContext<ContextProps>({});

type ControlledPopoverProps = XOR<{
  open: boolean;
  onToggle: (value: boolean) => void;
}>;

type RootProps = PropsWithChildren<
  ControlledPopoverProps &
    ContextProps & {
      dialog?: boolean;
    }
>;

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
  const ctx = useMemo(
    () => ({ side, sideOffset, align, alignOffset, testId }),
    [side, sideOffset, align, alignOffset, testId],
  );

  return (
    <Context.Provider value={ctx}>
      <RadixPopover.Root modal={!dialog} open={open} onOpenChange={onToggle}>
        {children}
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
        onClick={e => e.stopPropagation()}
      >
        <div className="z-50 rounded-md border border-token-container-border bg-block-background-default text-body shadow-shadow-2 duration-100 animate-in fade-in zoom-in-95">
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
