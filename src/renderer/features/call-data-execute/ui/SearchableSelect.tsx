import * as Ariakit from '@ariakit/react';
import * as RadixPopover from '@radix-ui/react-popover';
import {
  Children,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
  createContext,
  isValidElement,
  memo,
  startTransition,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type XOR } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Graphics, Input, ScrollArea, Surface, ThemeProvider, useTheme } from '@/shared/ui-kit';
import { gridSpaceConverter } from '@/shared/ui-kit/_helpers/gridSpaceConverter';

type ContextProps = {
  invalid?: boolean;
  disabled?: boolean;
  height?: 'sm' | 'md';
  testId?: string;
  onSearch: (query: string) => void;
};

const Context = createContext<ContextProps>({
  onSearch: () => {},
});

type ControlledSelectProps<T extends string> = {
  name?: string;
  placeholder: string;
  value: T | null;
  onChange: (value: T) => void;
  valueNode?: ReactNode;
} & XOR<{
  open: boolean;
  onToggle: (value: boolean) => void;
}>;

type RootProps<T extends string> = PropsWithChildren<
  ControlledSelectProps<T> & {
    invalid?: boolean;
    disabled?: boolean;
    height?: 'sm' | 'md';
    testId?: string;
    onSearch: (query: string) => void;
  }
>;

type ItemProps = PropsWithChildren<{
  value: string;
  depth?: number;
}>;

type GroupProps = PropsWithChildren<{
  title: ReactNode;
}>;

// Type guards for better type safety
const isSearchableSelectItem = (element: ReactElement): element is ReactElement<ItemProps> => {
  const props = element.props as Record<string, unknown>;
  return 'value' in props && typeof props.value === 'string';
};

const isSearchableSelectGroup = (element: ReactElement): element is ReactElement<GroupProps> => {
  const props = element.props as Record<string, unknown>;
  return 'title' in props && 'children' in props;
};

// Helper function to recursively find the selected item in children
const findSelectedItem = (children: ReactNode, selectedValue: string): ReactElement<ItemProps> | null => {
  const childrenArray = Children.toArray(children);

  for (const child of childrenArray) {
    if (isValidElement(child)) {
      // Check if it's a SearchableSelectItem with matching value
      if (isSearchableSelectItem(child) && child.props.value === selectedValue) {
        return child;
      }

      // Check if it's a SearchableSelectGroup and search within it
      if (isSearchableSelectGroup(child)) {
        const foundInGroup = findSelectedItem(child.props.children, selectedValue);
        if (foundInGroup) {
          return foundInGroup;
        }
      }
    }
  }

  return null;
};

// Helper function to extract content from the selected item
const getSelectedItemContent = (children: ReactNode, selectedValue: string): ReactNode => {
  const selectedItem = findSelectedItem(children, selectedValue);
  return selectedItem ? selectedItem.props.children : null;
};

const Root = <T extends string>({
  invalid,
  disabled,
  testId = 'Select',
  height = 'sm',
  open,
  onToggle,
  placeholder,
  valueNode,
  value: _value,
  onChange,
  onSearch,
  children,
}: RootProps<T>) => {
  const ctx = useMemo(
    () => ({ height, invalid, disabled, testId, onSearch }),
    [height, invalid, disabled, testId, onSearch],
  );
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const comboboxRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputMode, setIsInputMode] = useState(false);
  const { portalContainer, theme } = useTheme();

  // Use controlled open state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onToggle || setInternalOpen;

  // Check if there are any actual children (results)
  const hasResults = Children.count(children) > 0;
  const showEmptyState = searchQuery.length > 0 && !hasResults;

  // Get the content of the selected item
  const selectedItemContent = _value ? getSelectedItemContent(children, _value) : null;

  const handleContainerFocus = () => {
    if (!isInputMode) {
      setIsInputMode(true);
      setOpen(true);
      // Auto focus the input when switching to input mode
      setTimeout(() => {
        comboboxRef.current?.focus();
      }, 0);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow item selection
    setTimeout(() => {
      setIsInputMode(false);
      setOpen(false);
      setSearchQuery('');
      onSearch('');
    }, 150);
  };

  const handleInputChange = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleItemSelect = (itemValue: string) => {
    startTransition(() => {
      setIsInputMode(false);
      setOpen(false);
      setSearchQuery('');
      onSearch('');
      onChange(itemValue as T);
    });
  };

  return (
    <Context.Provider value={ctx}>
      <ThemeProvider preferStaticContent>
        <RadixPopover.Root modal open={isOpen} onOpenChange={setOpen}>
          <RadixPopover.Anchor asChild>
            <div ref={containerRef} className="w-full">
              {!isInputMode ? (
                <div
                  className={cnTw(
                    'relative flex w-full items-center pr-6 pl-[11px]',
                    'rounded-sm border text-footnote outline-offset-1',
                    'enabled:hover:shadow-card-shadow',
                    'data-[state=open]:border-active-container-border',
                    {
                      'h-8.5': height === 'sm',
                      'h-10.5': height === 'md',
                      'border-filter-border bg-input-background text-text-primary': theme === 'light',
                      'border-border-dark bg-background-dark text-white': theme === 'dark',
                      'bg-input-background-disabled text-text-tertiary': disabled,
                      'border-filter-border-negative': invalid,
                      'cursor-pointer': !disabled,
                      'cursor-not-allowed': disabled,
                    },
                  )}
                  tabIndex={disabled ? -1 : 0}
                  data-testid={testId}
                  onClick={disabled ? undefined : handleContainerFocus}
                  onFocus={disabled ? undefined : handleContainerFocus}
                  onKeyDown={
                    disabled
                      ? undefined
                      : (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleContainerFocus();
                          }
                        }
                  }
                >
                  <div className="flex-1 overflow-hidden text-start">
                    {valueNode || selectedItemContent || (
                      <span className={cnTw('text-footnote text-text-secondary', { 'text-text-tertiary': disabled })}>
                        {placeholder}
                      </span>
                    )}
                  </div>
                  <Icon name="down" size={16} className="absolute top-1/2 right-1.5 shrink-0 -translate-y-1/2" />
                </div>
              ) : (
                <Ariakit.ComboboxProvider
                  open={open}
                  setOpen={setOpen}
                  value={searchQuery}
                  defaultSelectedValue=""
                  setValue={handleInputChange}
                  setSelectedValue={handleItemSelect}
                >
                  <Ariakit.Combobox
                    autoSelect
                    autoFocus
                    ref={comboboxRef}
                    placeholder={placeholder}
                    render={({ onChange, ...props }) => <Input {...props} height={height} onChangeEvent={onChange} />}
                    onBlur={handleInputBlur}
                  />
                </Ariakit.ComboboxProvider>
              )}
            </div>
          </RadixPopover.Anchor>

          {isOpen && containerRef.current && (
            <RadixPopover.Portal container={portalContainer}>
              <RadixPopover.Content
                asChild
                avoidCollisions={false}
                hideWhenDetached
                data-testid={testId}
                style={{ width: `${containerRef.current.getBoundingClientRect().width}px` }}
                collisionPadding={gridSpaceConverter(2)}
                sideOffset={gridSpaceConverter(2)}
                align="center"
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
                    'z-50 flex flex-col',
                    'h-max max-h-(--radix-popper-available-height) min-w-20',
                    'origin-(--radix-popper-transform-origin) overflow-hidden duration-100 animate-in fade-in zoom-in-95',
                    {
                      'border-border-dark bg-background-dark': theme === 'dark',
                    },
                  )}
                >
                  <ScrollArea>
                    {isInputMode && (
                      <Ariakit.ComboboxProvider
                        open={isOpen}
                        setOpen={setOpen}
                        value={searchQuery}
                        defaultSelectedValue=""
                        setSelectedValue={handleItemSelect}
                      >
                        <Ariakit.ComboboxList ref={listboxRef} role="listbox">
                          <div className="flex flex-col gap-y-1 p-1">
                            {children}
                            {showEmptyState && (
                              <div className="flex flex-col items-center justify-center gap-2 px-2 py-6">
                                <Graphics name="emptyList" size={64} />
                                <FootnoteText className="text-text-tertiary">
                                  {t('emptyState.accountsNotFound')}
                                </FootnoteText>
                              </div>
                            )}
                          </div>
                        </Ariakit.ComboboxList>
                      </Ariakit.ComboboxProvider>
                    )}
                  </ScrollArea>
                </Surface>
              </RadixPopover.Content>
            </RadixPopover.Portal>
          )}
        </RadixPopover.Root>
      </ThemeProvider>
    </Context.Provider>
  );
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

const Item = memo(({ value, depth, children }: PropsWithChildren<ItemProps>) => {
  const { theme } = useTheme();

  return (
    <Ariakit.ComboboxItem
      focusOnHover
      value={value}
      className={cnTw(
        'flex w-full cursor-pointer rounded-sm px-3 py-2 text-footnote text-text-secondary contain-inline-size',
        'focus:bg-action-background-hover focus:outline-hidden data-active-item:bg-action-background-hover',
        {
          'text-text-tertiary focus:bg-block-background-hover data-active-item:bg-background-item-hover':
            theme === 'dark',
        },
      )}
      style={
        depth
          ? {
              paddingLeft: `${gridSpaceConverter((depth + 1) * 4)}px`,
            }
          : void 0
      }
    >
      <div className="h-full w-full truncate">{children}</div>
    </Ariakit.ComboboxItem>
  );
});

Item.displayName = 'SearchableSelectItem';

export const Select = Object.assign(Root, {
  Group,
  Item,
});
