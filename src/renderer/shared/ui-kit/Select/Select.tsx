import * as RadixSelect from '@radix-ui/react-select';
import { type PropsWithChildren, createContext, useContext, useMemo } from 'react';

import { type XOR } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { Surface } from '../Surface/Surface';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type ContextProps = {
  theme?: 'light' | 'dark';
  invalid?: boolean;
  disabled?: boolean;
  height?: 'sm' | 'md';
  testId?: string;
};

const Context = createContext<ContextProps>({});

type ControlledSelectProps<T extends string> = {
  placeholder: string;
  value: T | null;
  onChange: (value: T) => void;
} & XOR<{
  open: boolean;
  onToggle: (value: boolean) => void;
}>;

type RootProps<T extends string> = PropsWithChildren<ControlledSelectProps<T> & ContextProps>;

const Root = <T extends string>({
  theme = 'light',
  invalid,
  disabled,
  testId = 'Select',
  height = 'sm',
  open,
  onToggle,
  placeholder,
  value,
  onChange,
  children,
}: RootProps<T>) => {
  const ctx = useMemo(() => ({ theme, height, invalid, disabled, testId }), [theme, height, invalid, disabled, testId]);

  return (
    <Context.Provider value={ctx}>
      <RadixSelect.Root
        open={open}
        disabled={disabled}
        value={value ?? undefined}
        onOpenChange={onToggle}
        onValueChange={onChange}
      >
        <Button placeholder={placeholder} />
        <Content>{children}</Content>
      </RadixSelect.Root>
    </Context.Provider>
  );
};

type TriggerProps = {
  placeholder: string;
};

const Button = ({ placeholder }: TriggerProps) => {
  const { theme, height, invalid, disabled } = useContext(Context);

  return (
    <RadixSelect.Trigger
      className={cnTw(
        'relative flex w-full items-center pl-[11px] pr-6',
        'rounded border text-footnote outline-offset-1',
        'enabled:hover:shadow-card-shadow',
        'data-[state=open]:border-active-container-border',
        {
          'h-8.5': height === 'sm',
          'h-10.5': height === 'md',
          'border-filter-border bg-input-background text-text-primary': theme === 'light',
          'border-border-dark text-white': theme === 'dark',
          'bg-input-background-disabled text-text-tertiary': disabled,
          'border-filter-border-negative': invalid,
        },
      )}
    >
      <div className="overflow-hidden">
        <RadixSelect.Value placeholder={placeholder} />
      </div>
      <Icon name="down" size={16} className="absolute right-1.5 top-1/2 shrink-0 -translate-y-1/2" />
    </RadixSelect.Trigger>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  const { portalContainer } = useTheme();
  const { testId, theme } = useContext(Context);

  return (
    <RadixSelect.Portal container={portalContainer}>
      <RadixSelect.Content
        asChild
        position="popper"
        avoidCollisions={false}
        collisionPadding={gridSpaceConverter(2)}
        sideOffset={gridSpaceConverter(2)}
        style={{ width: 'var(--radix-select-trigger-width)' }}
        data-testid={testId}
      >
        <Surface
          elevation={1}
          className={cnTw(
            'z-50 flex flex-col',
            'h-max max-h-[--radix-popper-available-height] min-w-20',
            'overflow-hidden duration-100 animate-in fade-in zoom-in-95',
            {
              'border-border-dark bg-background-dark': theme === 'dark',
            },
          )}
        >
          <ScrollArea>
            <RadixSelect.Viewport asChild>
              <div className="flex flex-col gap-y-1 p-1">{children}</div>
            </RadixSelect.Viewport>
          </ScrollArea>
        </Surface>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
};

type ItemProps = {
  value: string;
};

const Item = ({ value, children }: PropsWithChildren<ItemProps>) => {
  const { theme } = useContext(Context);

  return (
    <RadixSelect.Item
      value={value}
      className={cnTw(
        'flex w-full cursor-pointer rounded px-3 py-2 text-footnote text-text-secondary',
        'focus:bg-action-background-hover focus:outline-none data-[highlighted]:bg-action-background-hover',
        {
          'focus:bg-block-background-hover data-[highlighted]:bg-background-item-hover': theme === 'dark',
        },
      )}
    >
      <RadixSelect.ItemText asChild>
        <div className="h-full w-full truncate">{children}</div>
      </RadixSelect.ItemText>
    </RadixSelect.Item>
  );
};

export const Select = Object.assign(Root, {
  Item,
});
