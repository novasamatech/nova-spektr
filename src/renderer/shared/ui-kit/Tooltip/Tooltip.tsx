import * as RadixTooltip from '@radix-ui/react-tooltip';
import { type PropsWithChildren, createContext, useContext, useMemo } from 'react';

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

type RootProps = PropsWithChildren<
  ContextProps & {
    open?: boolean;
    onToggle?: (value: boolean) => unknown;
    delay?: number;
    enableHover?: boolean;
  }
>;

const Root = ({
  delay = 100,
  enableHover,
  open,
  onToggle,
  children,
  side = 'top',
  sideOffset = 1,
  align = 'center',
  alignOffset = 0,
  testId = 'Tooltip',
}: RootProps) => {
  const ctx = useMemo(
    () => ({ side, sideOffset, align, alignOffset, testId }),
    [side, sideOffset, align, alignOffset, testId],
  );

  return (
    <Context.Provider value={ctx}>
      <RadixTooltip.Provider delayDuration={delay} disableHoverableContent={!enableHover}>
        <RadixTooltip.Root open={open} onOpenChange={onToggle}>
          {children}
        </RadixTooltip.Root>
      </RadixTooltip.Provider>
    </Context.Provider>
  );
};

const Trigger = ({ children }: PropsWithChildren) => {
  return <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>;
};

const Content = ({ children }: PropsWithChildren) => {
  const { portalContainer } = useTheme();
  const { side, align, alignOffset, sideOffset, testId } = useContext(Context);

  return (
    <RadixTooltip.Portal container={portalContainer}>
      <RadixTooltip.Content
        className="z-50 h-fit max-h-[var(--radix-tooltip-content-available-height)] w-fit max-w-48 rounded-md bg-switch-background-active px-2 py-1 text-help-text text-white duration-100 animate-in fade-in zoom-in-95"
        side={side}
        align={align}
        arrowPadding={gridSpaceConverter(3)}
        collisionPadding={gridSpaceConverter(2)}
        alignOffset={alignOffset && gridSpaceConverter(alignOffset)}
        sideOffset={sideOffset && gridSpaceConverter(sideOffset)}
        data-testid={testId}
      >
        {children}
        <RadixTooltip.Arrow
          width={gridSpaceConverter(3)}
          height={gridSpaceConverter(2)}
          className="fill-switch-background-active"
        />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  );
};

export const Tooltip = Object.assign(Root, {
  Trigger,
  Content,
});
