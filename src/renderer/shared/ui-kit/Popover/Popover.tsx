import * as RadixPopover from '@radix-ui/react-popover';
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type XOR } from '@/shared/core';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

const HOVER_CLOSE_DELAY_MS = 120;

type ContextProps = {
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  testId?: string;
  enableHover?: boolean;
  scheduleHoverOpen?: (open: boolean) => void;
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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce hover-close so the mouse can traverse the gap between trigger
  // and content (sideOffset). Without the delay, leaving the trigger fires
  // `setHoverOpen(false)` before the content's `mouseEnter` lands → popover
  // closes mid-traversal.
  const scheduleHoverOpen = useCallback((next: boolean) => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (next) {
      setHoverOpen(true);
    } else {
      closeTimerRef.current = setTimeout(() => {
        setHoverOpen(false);
        closeTimerRef.current = null;
      }, HOVER_CLOSE_DELAY_MS);
    }
  }, []);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const ctx = useMemo(
    () => ({
      side,
      sideOffset,
      align,
      alignOffset,
      testId,
      enableHover,
      scheduleHoverOpen: enableHover ? scheduleHoverOpen : undefined,
    }),
    [side, sideOffset, align, alignOffset, testId, enableHover, scheduleHoverOpen],
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
  const { enableHover, scheduleHoverOpen } = useContext(Context);

  return (
    <RadixPopover.Trigger
      asChild
      onMouseEnter={enableHover && scheduleHoverOpen ? () => scheduleHoverOpen(true) : undefined}
      onMouseLeave={enableHover && scheduleHoverOpen ? () => scheduleHoverOpen(false) : undefined}
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
  const { align, alignOffset, side, sideOffset, testId, enableHover, scheduleHoverOpen } = useContext(Context);

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
        onMouseEnter={enableHover && scheduleHoverOpen ? () => scheduleHoverOpen(true) : undefined}
        onMouseLeave={enableHover && scheduleHoverOpen ? () => scheduleHoverOpen(false) : undefined}
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
