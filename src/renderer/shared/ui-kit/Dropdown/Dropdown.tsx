import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { type PropsWithChildren, type ReactNode, createContext, useCallback, useContext, useMemo } from 'react';

import { type XOR } from '@/shared/core';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { Checkbox } from '../Checkbox/Checkbox';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { Surface } from '../Surface/Surface';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type ContextProps = {
  isOpen?: boolean;
  preventClosing?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  testId?: string;
};

const Context = createContext<ContextProps>({});

type ControlledDropdownProps = XOR<{
  open: boolean;
  onToggle: (value: boolean) => void;
}>;

type RootProps = PropsWithChildren<ControlledDropdownProps & ContextProps>;

const Root = ({
  open,
  onToggle,
  preventClosing = false,
  side = 'bottom',
  sideOffset = 2,
  align = 'center',
  alignOffset = 0,
  testId = 'Dropdown',
  children,
}: RootProps) => {
  const [isOpen, toggleIsOpen] = useToggle(open);

  const ctx = useMemo(
    () => ({ isOpen, preventClosing, side, sideOffset, align, alignOffset, testId }),
    [isOpen, preventClosing, side, sideOffset, align, alignOffset, testId],
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
      <DropdownMenu.Root modal open={open} onOpenChange={openChange}>
        {children}
      </DropdownMenu.Root>
    </Context.Provider>
  );
};

const Trigger = ({ children }: { children: ((open: boolean) => ReactNode) | ReactNode }) => {
  const { isOpen } = useContext(Context);

  return (
    <DropdownMenu.Trigger asChild>
      {typeof children === 'function' ? children(Boolean(isOpen)) : children}
    </DropdownMenu.Trigger>
  );
};

const Separator = () => {
  return (
    <DropdownMenu.Separator className="h-[1px] w-full px-2">
      <div className="h-full w-full bg-divider" />
    </DropdownMenu.Separator>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  const { portalContainer } = useTheme();
  const { side, sideOffset, align, alignOffset, testId } = useContext(Context);

  return (
    <DropdownMenu.Portal container={portalContainer}>
      <DropdownMenu.Content
        loop
        asChild
        avoidCollisions={false}
        side={side}
        align={align}
        collisionPadding={gridSpaceConverter(2)}
        alignOffset={alignOffset && gridSpaceConverter(alignOffset)}
        sideOffset={sideOffset && gridSpaceConverter(sideOffset)}
        data-testid={testId}
      >
        <Surface
          elevation={1}
          className={cnTw(
            'flex flex-col',
            'h-max max-h-[--radix-popper-available-height] max-w-60',
            'min-w-20 overflow-hidden duration-100 animate-in fade-in zoom-in-95',
          )}
        >
          <ScrollArea>
            <div className="flex flex-col gap-y-1 p-1">{children}</div>
          </ScrollArea>
        </Surface>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
};

type GroupProps = PropsWithChildren<{
  label?: ReactNode;
}>;

const Group = ({ label, children }: GroupProps) => {
  return (
    <DropdownMenu.Group className="flex flex-col gap-1">
      {label ? (
        <DropdownMenu.Label className="px-3 py-1 text-footnote text-text-tertiary">{label}</DropdownMenu.Label>
      ) : null}
      {children}
    </DropdownMenu.Group>
  );
};

type ItemProps = PropsWithChildren<{
  onSelect?: VoidFunction;
}>;

const Item = ({ children, onSelect }: ItemProps) => {
  return (
    <DropdownMenu.Item
      className="cursor-pointer rounded bg-block-background-default hover:bg-block-background-hover focus:bg-block-background-hover"
      onSelect={onSelect}
    >
      {children}
    </DropdownMenu.Item>
  );
};

type CheckboxItemProps = PropsWithChildren<{
  checked: boolean;
  onChange?: (value: boolean) => void;
  onSelect?: VoidFunction;
}>;

const CheckboxItem = ({ checked, onChange, onSelect, children }: CheckboxItemProps) => {
  const { preventClosing } = useContext(Context);

  const handleSelect = (event: Event) => {
    if (preventClosing) {
      event.preventDefault();
    }
    onSelect?.();
  };

  return (
    <DropdownMenu.CheckboxItem
      checked={checked}
      className={cnTw(
        'flex justify-center gap-2 rounded-md px-3 py-2 text-footnote text-text-secondary',
        'cursor-pointer',
        {
          'bg-selected-background text-text-primary': checked,
          'bg-block-background-default hover:bg-block-background-hover': !checked,
        },
      )}
      onCheckedChange={onChange}
      onSelect={handleSelect}
    >
      <Checkbox checked={checked} />
      {children}
    </DropdownMenu.CheckboxItem>
  );
};

export const Dropdown = Object.assign(Root, {
  Trigger,
  Content,
  Item,
  CheckboxItem,
  Group,
  Separator,
});
