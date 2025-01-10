import * as Ariakit from '@ariakit/react';
import * as RadixPopover from '@radix-ui/react-popover';
import {
  Children,
  type ComponentProps,
  type PropsWithChildren,
  type ReactNode,
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
  anchorRef?: RefObject<HTMLDivElement>;
};

const Context = createContext<ContextProps & ExpandedContextProps>({});

type InputProps = Pick<
  ComponentProps<typeof Input>,
  'disabled' | 'invalid' | 'placeholder' | 'height' | 'prefixElement' | 'onChange'
>;

type ControlledPopoverProps = {
  value: string;
  onChange: (value: string) => void;
  onInput: (value: string) => void;
};

type RootProps = PropsWithChildren<ControlledPopoverProps & ContextProps & InputProps>;

const Root = ({ testId = 'Combobox', value, onChange, onInput, children, ...inputProps }: RootProps) => {
  const comboboxRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const [open, onOpenChange] = useState(false);

  const ctx = useMemo(() => ({ open, onOpenChange, testId, comboboxRef, listboxRef, anchorRef }), [open, testId]);

  return (
    <Context.Provider value={ctx}>
      <RadixPopover.Root modal open={open} onOpenChange={onOpenChange}>
        <Ariakit.ComboboxProvider
          open={open}
          setOpen={onOpenChange}
          defaultValue={value}
          defaultSelectedValue={value}
          setSelectedValue={onChange}
          setValue={value => startTransition(() => onChange(value))}
        >
          <Trigger {...inputProps} onChange={onInput} />
          <Content>{children}</Content>
        </Ariakit.ComboboxProvider>
      </RadixPopover.Root>
    </Context.Provider>
  );
};

const Trigger = ({ placeholder, ...inputProps }: InputProps) => {
  const { onOpenChange, comboboxRef, anchorRef } = useContext(Context);

  return (
    <RadixPopover.Anchor asChild>
      <div ref={anchorRef} className="w-full">
        <Ariakit.Combobox
          autoSelect
          ref={comboboxRef}
          placeholder={placeholder}
          render={({ onChange, ...props }) => <Input {...props} {...inputProps} onChangeEvent={onChange} />}
          onFocus={() => onOpenChange?.(true)}
          onBlur={() => onOpenChange?.(false)}
        />
      </div>
    </RadixPopover.Anchor>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  const { portalContainer } = useTheme();
  const { testId, comboboxRef, listboxRef, anchorRef } = useContext(Context);

  if (Children.count(children) === 0 || !anchorRef?.current) return null;

  return (
    <RadixPopover.Portal container={portalContainer}>
      <RadixPopover.Content
        asChild
        hideWhenDetached
        data-testid={testId}
        style={{ width: `${anchorRef.current.getBoundingClientRect().width}px` }}
        collisionPadding={gridSpaceConverter(2)}
        sideOffset={gridSpaceConverter(2)}
        onOpenAutoFocus={e => e.preventDefault()}
        onInteractOutside={event => {
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
            'z-50 flex h-max max-h-[--radix-popper-available-height] flex-col p-1',
            'overflow-hidden duration-100 animate-in fade-in zoom-in-95',
          )}
        >
          <ScrollArea>
            <Ariakit.ComboboxList ref={listboxRef} role="listbox">
              {children}
            </Ariakit.ComboboxList>
          </ScrollArea>
        </Surface>
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
};

type GroupProps = {
  title: ReactNode;
};
const Group = ({ title, children }: PropsWithChildren<GroupProps>) => {
  if (Children.count(children) === 0) return null;

  return (
    <Ariakit.ComboboxGroup className="mb-1 last:mb-0">
      <Ariakit.ComboboxGroupLabel>
        <div className="mb-1 px-3 py-1 text-help-text text-text-secondary">{title}</div>
      </Ariakit.ComboboxGroupLabel>
      {children}
    </Ariakit.ComboboxGroup>
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
        'flex cursor-pointer rounded px-3 py-2 text-footnote text-text-secondary',
        'bg-block-background-default data-[active-item]:bg-block-background-hover',
        'mb-1 last:mb-0',
      )}
    >
      {children}
    </Ariakit.ComboboxItem>
  );
};

export const Combobox = Object.assign(Root, {
  Group,
  Item,
});
