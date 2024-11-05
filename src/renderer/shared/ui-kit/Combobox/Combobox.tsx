import * as Ariakit from '@ariakit/react';
import * as RadixPopover from '@radix-ui/react-popover';
import {
  Children,
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
import { Input } from '@/shared/ui';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { Surface } from '../Surface/Surface';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type ContextProps = {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  testId?: string;
  comboboxRef?: RefObject<HTMLInputElement>;
  listboxRef?: RefObject<HTMLDivElement>;
};

const Context = createContext<ContextProps>({});

type ControlledPopoverProps = {
  selected: string;
  onChange: (value: string) => void;
};

type RootProps = PropsWithChildren<ControlledPopoverProps & ContextProps>;

const Root = ({
  side = 'bottom',
  sideOffset = 3,
  align = 'center',
  alignOffset = 0,
  testId = 'Combobox',
  selected,
  onChange,
  children,
}: RootProps) => {
  const comboboxRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  const ctx = useMemo(
    () => ({ isOpen, setIsOpen, side, sideOffset, align, alignOffset, testId, comboboxRef, listboxRef }),
    [isOpen, side, sideOffset, align, alignOffset, testId],
  );

  return (
    <Context.Provider value={ctx}>
      <RadixPopover.Root modal open={isOpen} onOpenChange={setIsOpen}>
        <Ariakit.ComboboxProvider
          open={isOpen}
          setOpen={setIsOpen}
          defaultValue={selected}
          defaultSelectedValue={selected}
          setSelectedValue={onChange}
          setValue={(value) => startTransition(() => onChange(value))}
        >
          {children}
        </Ariakit.ComboboxProvider>
      </RadixPopover.Root>
    </Context.Provider>
  );
};

type TriggerProps = {
  placeholder?: string;
};
const Trigger = ({ placeholder }: TriggerProps) => {
  const { setIsOpen, comboboxRef } = useContext(Context);

  return (
    <RadixPopover.Anchor asChild>
      <Ariakit.Combobox
        autoSelect
        autoComplete="both"
        ref={comboboxRef}
        placeholder={placeholder}
        render={(props) => <Input {...props} />}
        onFocus={() => setIsOpen?.(true)}
        onBlur={() => setIsOpen?.(false)}
      />
    </RadixPopover.Anchor>
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
        'bg-block-background-default hover:bg-block-background-hover data-[active-item]:bg-block-background-hover',
      )}
    >
      {children}
    </Ariakit.ComboboxItem>
  );
};

// var(--radix-popover-trigger-width) takes into account <input/> and not the wrapper that has px-3
const INPUT_PADDING = gridSpaceConverter(3 * 2);

const Content = ({ children }: PropsWithChildren) => {
  const { portalContainer } = useTheme();
  const { align, alignOffset, side, sideOffset, testId, comboboxRef, listboxRef } = useContext(Context);

  if (Children.count(children) === 0) return null;

  return (
    <RadixPopover.Portal container={portalContainer}>
      <RadixPopover.Content
        asChild
        hideWhenDetached
        side={side}
        align={align}
        style={{ width: `calc(var(--radix-popover-trigger-width) + ${INPUT_PADDING}px)` }}
        collisionPadding={gridSpaceConverter(2)}
        alignOffset={alignOffset && gridSpaceConverter(alignOffset)}
        sideOffset={sideOffset && gridSpaceConverter(sideOffset)}
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

export const Combobox = Object.assign(Root, {
  Trigger,
  Content,
  Item,
});
