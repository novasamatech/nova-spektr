import * as RadixPopover from '@radix-ui/react-popover';
import { type PropsWithChildren, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { type XOR } from '@/shared/core';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type ContextProps = {
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  testId?: string;
  enableHover?: boolean;
  openHover?: () => void;
  closeHover?: () => void;
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
      enableHover?: boolean;
    }
>;

const HOVER_CLOSE_DELAY = 100;

const Root = ({
  dialog,
  open,
  onToggle,
  side = 'bottom',
  sideOffset = 2,
  align = 'center',
  alignOffset = 0,
  testId = 'Popover',
  enableHover,
  children,
}: RootProps) => {
  const [hoverOpen, setHoverOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openHover = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setHoverOpen(true);
  }, []);

  const closeHover = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setHoverOpen(false);
      closeTimer.current = null;
    }, HOVER_CLOSE_DELAY);
  }, []);

  const ctx = useMemo(
    () => ({
      side,
      sideOffset,
      align,
      alignOffset,
      testId,
      enableHover,
      openHover: enableHover ? openHover : undefined,
      closeHover: enableHover ? closeHover : undefined,
    }),
    [side, sideOffset, align, alignOffset, testId, enableHover, openHover, closeHover],
  );

  return (
    <Context.Provider value={ctx}>
      <RadixPopover.Root
        modal={enableHover ? false : !dialog}
        open={enableHover ? hoverOpen : open}
        onOpenChange={enableHover ? undefined : onToggle}
      >
        {children}
      </RadixPopover.Root>
    </Context.Provider>
  );
};

const Trigger = ({ children }: PropsWithChildren) => {
  const { enableHover, openHover, closeHover } = useContext(Context);

  return (
    <RadixPopover.Trigger
      asChild
      onMouseEnter={enableHover && openHover ? openHover : undefined}
      onMouseLeave={enableHover && closeHover ? closeHover : undefined}
    >
      {children}
    </RadixPopover.Trigger>
  );
};

const Anchor = ({ children }: PropsWithChildren) => {
  return <RadixPopover.Anchor asChild>{children}</RadixPopover.Anchor>;
};

const Content = ({ children }: PropsWithChildren) => {
  const { portalContainer } = useTheme();
  const { align, alignOffset, side, sideOffset, testId, enableHover, openHover, closeHover } = useContext(Context);

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
        onMouseEnter={enableHover && openHover ? openHover : undefined}
        onMouseLeave={enableHover && closeHover ? closeHover : undefined}
      >
        <div className="pointer-events-auto z-50 h-fit max-h-(--radix-popper-available-height) min-h-0 origin-(--radix-popper-transform-origin) overflow-hidden rounded-md border border-token-container-border bg-block-background-default text-body shadow-shadow-2 duration-100 animate-in fade-in zoom-in-95">
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
