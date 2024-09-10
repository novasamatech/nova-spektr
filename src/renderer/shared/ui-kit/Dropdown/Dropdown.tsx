import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { type PropsWithChildren, type ReactNode, createContext, useContext, useMemo } from 'react';

import { type XOR } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { Checkbox } from '@/shared/ui';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { Surface } from '../Surface/Surface';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type ContextProps = {
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
  const ctx = useMemo(
    () => ({ preventClosing, side, sideOffset, align, alignOffset, testId }),
    [preventClosing, side, sideOffset, align, alignOffset, testId],
  );

  return (
    <Context.Provider value={ctx}>
      <DropdownMenu.Root open={open} modal onOpenChange={onToggle}>
        {children}
      </DropdownMenu.Root>
    </Context.Provider>
  );
};

const Trigger = ({ children }: PropsWithChildren) => <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>;

const Separator = () => (
  <DropdownMenu.Separator className="h-[1px] w-full px-2">
    <div className="h-full w-full bg-divider" />
  </DropdownMenu.Separator>
);

const Content = ({ children }: PropsWithChildren) => {
  const { portalContainer } = useTheme();
  const { side, sideOffset, align, alignOffset, testId } = useContext(Context);

  return (
    <DropdownMenu.Portal container={portalContainer}>
      <DropdownMenu.Content
        loop
        avoidCollisions={false}
        side={side}
        align={align}
        collisionPadding={gridSpaceConverter(2)}
        alignOffset={alignOffset && gridSpaceConverter(alignOffset)}
        sideOffset={sideOffset && gridSpaceConverter(sideOffset)}
        data-testid={testId}
        asChild
      >
        <Surface
          elevation={1}
          className={cnTw(
            'min-w-20 overflow-hidden duration-100 animate-in fade-in zoom-in-95',
            'h-max max-h-[--radix-popper-available-height] max-w-60',
            'flex flex-col',
          )}
        >
          <ScrollArea>
            <div className="flex flex-col gap-1 p-1">{children}</div>
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
  icon?: ReactNode;
  onSelect?: VoidFunction;
}>;

const Item = ({ onSelect, icon, children }: ItemProps) => {
  return (
    <DropdownMenu.Item
      className={cnTw(
        'flex gap-2 rounded-md px-3 py-2 text-footnote text-text-secondary',
        'bg-block-background-default: cursor-pointer hover:bg-block-background-hover',
      )}
      onSelect={onSelect}
    >
      {icon ? <div className="text-icon-accent">{icon}</div> : null}
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

type DropdownShape = typeof Root & {
  Trigger: typeof Trigger;
  Content: typeof Content;
  Item: typeof Item;
  CheckboxItem: typeof CheckboxItem;
  Group: typeof Group;
  Separator: typeof Separator;
};

const Dropdown: DropdownShape = Object.assign(Root, {
  Trigger,
  Content,
  Item,
  CheckboxItem,
  Group,
  Separator,
});

export { Dropdown };
