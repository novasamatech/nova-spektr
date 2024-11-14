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
  testId?: string;
};

const Context = createContext<ContextProps>({});

type ControlledSelectProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
} & XOR<{
  open: boolean;
  onToggle: (value: boolean) => void;
}>;

type RootProps = PropsWithChildren<ControlledSelectProps & ContextProps>;

const Root = ({
  theme = 'light',
  invalid,
  disabled,
  testId = 'Select',
  open,
  onToggle,
  placeholder,
  value,
  onChange,
  children,
}: RootProps) => {
  const ctx = useMemo(() => ({ theme, invalid, disabled, testId }), [theme, invalid, disabled, testId]);

  return (
    <Context.Provider value={ctx}>
      <RadixSelect.Root open={open} disabled={disabled} value={value} onOpenChange={onToggle} onValueChange={onChange}>
        <Button placeholder={placeholder} />
        {children}
      </RadixSelect.Root>
    </Context.Provider>
  );
};

type TriggerProps = {
  placeholder: string;
};

const Button = ({ placeholder }: TriggerProps) => {
  const { theme, invalid, disabled } = useContext(Context);

  return (
    <RadixSelect.Trigger
      className={cnTw(
        'w-full px-[11px] py-[7px]',
        'rounded border text-footnote outline-offset-1',
        'enabled:hover:shadow-card-shadow',
        'data-[state=open]:border-active-container-border',
        {
          'border-filter-border bg-input-background text-text-primary': theme === 'light',
          'border-border-dark text-white': theme === 'dark',
          'bg-input-background-disabled text-text-tertiary': disabled,
          'border-filter-border-negative': invalid,
        },
      )}
    >
      <div className="flex items-center justify-between">
        <RadixSelect.Value placeholder={placeholder} />
        <Icon name="down" size={16} className="shrink-0" />
      </div>
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
            'h-max max-h-[--radix-popper-available-height] max-w-60',
            'min-w-20 overflow-hidden duration-100 animate-in fade-in zoom-in-95',
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
        'flex cursor-pointer rounded p-2 text-footnote text-text-secondary',
        'focus:bg-action-background-hover focus:outline-none data-[highlighted]:bg-action-background-hover',
        {
          'focus:bg-block-background-hover data-[highlighted]:bg-background-item-hover': theme === 'dark',
        },
      )}
    >
      <RadixSelect.ItemText asChild>
        <div className="h-full w-full">{children}</div>
      </RadixSelect.ItemText>
    </RadixSelect.Item>
  );
};

export const Select = Object.assign(Root, {
  Content,
  Item,
});
