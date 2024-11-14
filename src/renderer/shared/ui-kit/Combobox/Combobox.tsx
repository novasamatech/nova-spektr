import * as Ariakit from '@ariakit/react';
import * as RadixPopover from '@radix-ui/react-popover';
import {
  Children,
  type ComponentProps,
  type PropsWithChildren,
  type RefObject,
  createContext,
  startTransition,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Input } from '../Input/Input';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { Surface } from '../Surface/Surface';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type ContextProps = {
  testId?: string;
  open?: boolean;
  onOpenChange?: (value: boolean) => void;
};

type ExpandedContextProps = {
  comboboxRef?: RefObject<HTMLInputElement>;
  listboxRef?: RefObject<HTMLDivElement>;
};

const Context = createContext<ContextProps & ExpandedContextProps>({});

type InputProps = Pick<ComponentProps<typeof Input>, 'disabled' | 'invalid' | 'placeholder' | 'height'>;

type ControlledPopoverProps = {
  value: string;
  onChange: (value: string) => void;
};

type RootProps = PropsWithChildren<ControlledPopoverProps & ContextProps & InputProps>;

const Root = ({ testId = 'Combobox', value, onChange, children, ...inputProps }: RootProps) => {
  const comboboxRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const [open, onOpenChange] = useState(false);

  const ctx = useMemo(() => ({ open, onOpenChange, testId, comboboxRef, listboxRef }), [open, testId]);

  return (
    <Context.Provider value={ctx}>
      <RadixPopover.Root modal open={open} onOpenChange={onOpenChange}>
        <Ariakit.ComboboxProvider
          open={open}
          setOpen={onOpenChange}
          defaultValue={value}
          defaultSelectedValue={value}
          setSelectedValue={onChange}
          setValue={(value) => startTransition(() => onChange(value))}
        >
          <Trigger {...inputProps} />
          {children}
        </Ariakit.ComboboxProvider>
      </RadixPopover.Root>
    </Context.Provider>
  );
};

const Trigger = ({ placeholder, ...inputProps }: InputProps) => {
  const { onOpenChange, comboboxRef } = useContext(Context);

  return (
    <RadixPopover.Anchor asChild>
      <Ariakit.Combobox
        autoSelect
        autoComplete="both"
        ref={comboboxRef}
        placeholder={placeholder}
        render={({ onChange, ...props }) => <Input {...props} {...inputProps} onChangeEvent={onChange} />}
        onFocus={() => onOpenChange?.(true)}
        onBlur={() => onOpenChange?.(false)}
      />
    </RadixPopover.Anchor>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  const { portalContainer } = useTheme();
  const { testId, comboboxRef, listboxRef } = useContext(Context);

  if (Children.count(children) === 0) return null;

  return (
    <RadixPopover.Portal container={portalContainer}>
      <RadixPopover.Content
        asChild
        hideWhenDetached
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        collisionPadding={gridSpaceConverter(2)}
        sideOffset={gridSpaceConverter(2)}
        data-testid={testId}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(event) => {
          const target = event.target as Element | null;
          const isCombobox = target === comboboxRef?.current;
          const inListbox = target && listboxRef?.current?.contains(target);
          if (isCombobox || inListbox) {
            event.preventDefault();
          }
        }}
      >
        <Surface
          elevation={1}
          className={cnTw(
            'flex h-max max-h-[--radix-popper-available-height] flex-col',
            'overflow-hidden duration-100 animate-in fade-in zoom-in-95',
          )}
        >
          <ScrollArea>
            <Ariakit.ComboboxList className="flex flex-col gap-y-1 p-1" ref={listboxRef} role="listbox">
              {children}
            </Ariakit.ComboboxList>
          </ScrollArea>
        </Surface>
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
};

type ItemProps = {
  value: string;
};
const Item = ({ value, children }: PropsWithChildren<ItemProps>) => {
  return (
    <Ariakit.ComboboxItem
      focusOnHover
      value={value}
      className={cnTw(
        'flex cursor-pointer rounded p-2 text-footnote text-text-secondary',
        'bg-block-background-default data-[active-item]:bg-block-background-hover',
      )}
    >
      {children}
    </Ariakit.ComboboxItem>
  );
};

export const Combobox = Object.assign(Root, {
  Content,
  Item,
});
