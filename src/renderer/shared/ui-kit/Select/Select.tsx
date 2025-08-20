import {
  Combobox,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxItem,
  ComboboxList,
  ComboboxProvider,
} from '@ariakit/react';
import * as RadixPopover from '@radix-ui/react-popover';
import React, {
  Children,
  type PropsWithChildren,
  type ReactNode,
  createContext,
  memo,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type XOR } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Graphics } from '../Graphics/Graphics';
import { Input } from '../Input/Input';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { Surface } from '../Surface/Surface';
import { useTheme } from '../Theme/useTheme';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type ContextProps = {
  invalid?: boolean;
  disabled?: boolean;
  height?: 'sm' | 'md';
  testId?: string;
  onSearch?: (query: string) => void;
  isInputMode: boolean;
  onItemSelect: (value: string) => void;
  selectedValue?: string | null;
  setSelectedItemContent: (content: ReactNode) => void;
  focusedIndex: number;
  availableItems: string[];
  setAvailableItems: (items: string[] | ((prev: string[]) => string[])) => void;
};

const Context = createContext<ContextProps>({
  isInputMode: false,
  onItemSelect: () => {},
  setSelectedItemContent: () => {},
  focusedIndex: -1,
  availableItems: [],
  setAvailableItems: () => {},
});

type ControlledSelectProps<T extends string> = {
  name?: string;
  placeholder: string;
  value: T | null;
  onChange: (value: T) => void;
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
    onSearch?: (query: string) => void;
  }
>;

type ItemProps = PropsWithChildren<{
  value: string;
  depth?: number;
}>;

type GroupProps = PropsWithChildren<{
  title: ReactNode;
}>;

const Root = <T extends string>({
  invalid,
  disabled,
  testId = 'Select',
  height = 'sm',
  open,
  onToggle,
  placeholder,
  value: _value,
  onChange,
  onSearch,
  children,
}: RootProps<T>) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const comboboxRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputMode, setIsInputMode] = useState(false);
  const [selectedItemContent, setSelectedItemContent] = useState<ReactNode>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [availableItems, setAvailableItems] = useState<string[]>([]);
  const { portalContainer, theme } = useTheme();

  // Use controlled open state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onToggle || setInternalOpen;

  // Check if there are any actual children (results)
  const hasResults = Children.count(children) > 0;
  const showEmptyState = !!onSearch && searchQuery.length > 0 && !hasResults;

  // Clear selected item content when value changes to null
  useEffect(() => {
    if (!_value) {
      setSelectedItemContent(null);
    }
  }, [_value]);

  const handleItemSelect = (itemValue: string) => {
    console.log('🎉 handleItemSelect called with:', itemValue);
    startTransition(() => {
      if (onSearch) {
        setIsInputMode(false);
        setSearchQuery('');
        onSearch('');
      }
      setOpen(false);
      onChange(itemValue as T);
      console.log('✅ Item selection completed');
    });
  };

  const handleContainerClick = () => {
    if (onSearch && !isInputMode) {
      setIsInputMode(true);
      setOpen(true);
      // Auto focus the input when switching to input mode
      setTimeout(() => {
        comboboxRef.current?.focus();
      }, 0);
    } else if (!onSearch) {
      // For non-searchable selects, just open the dropdown
      setOpen(true);
    }
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    console.log('🎯 CONTAINER keydown:', e.key, { isOpen, isInputMode });
    if (!isOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      handleContainerClick();
    } else if (isOpen) {
      handleKeyNavigation(e);
    }
  };

  const handleInputBlur = () => {
    if (!onSearch) return;

    // Delay hiding to allow item selection
    setTimeout(() => {
      setIsInputMode(false);
      setOpen(false);
      setSearchQuery('');
      onSearch('');
    }, 150);
  };

  const handleInputChange = (query: string) => {
    if (!onSearch) return;

    setSearchQuery(query);
    onSearch(query);
  };

  // Keyboard navigation utilities
  const updateAvailableItems = useCallback((items: string[] | ((prev: string[]) => string[])) => {
    setAvailableItems(items);
    // Reset focus when items change if it's a direct array update
    if (Array.isArray(items)) {
      setFocusedIndex(-1);
    }
  }, []);

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    console.log('🧭 NAVIGATION keydown:', e.key, {
      isOpen,
      isInputMode,
      itemsCount: availableItems.length,
      availableItems,
      focusedIndex,
    });

    // Allow Escape key even in input mode
    if (e.key === 'Escape') {
      console.log('🚪 Escape processing');
      e.preventDefault();
      setOpen(false);
      setFocusedIndex(-1);
      return;
    }

    if (!isOpen || availableItems.length === 0) {
      // console.log('⛔ NAVIGATION blocked:', { isOpen, itemsCount: availableItems.length });
      // return;
    }

    // In input mode, only handle specific keys that don't interfere with typing
    if (isInputMode && !['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      console.log('⛔ INPUT MODE - ignoring key:', e.key);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        console.log('⬇️ ArrowDown processing', e, { availableItems });
        // e.preventDefault();
        setFocusedIndex(prev => (prev < availableItems.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        console.log('⬆️ ArrowUp processing', e);
        // e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : availableItems.length - 1));
        break;
      case 'Enter':
      case ' ':
        console.log('✅ Enter/Space processing, focusedIndex:', focusedIndex, 'availableItems:', availableItems);
        if (focusedIndex >= 0 && focusedIndex < availableItems.length) {
          e.preventDefault();
          const focusedItem = availableItems[focusedIndex];
          console.log('🎯 Selecting focused item:', focusedItem);
          if (focusedItem) {
            handleItemSelect(focusedItem);
          }
        } else {
          console.log('❌ No valid item to select:', { focusedIndex, availableItemsLength: availableItems.length });
        }
        break;
    }
  };

  // Reset focused index and manage focus when dropdown state changes
  useEffect(() => {
    if (isOpen && !isInputMode) {
      // Find the currently selected item and focus it
      const selectedIndex = availableItems.findIndex(item => item === _value);
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : -1);

      // Focus the dropdown for keyboard navigation
      setTimeout(() => {
        if (listboxRef.current) {
          listboxRef.current.focus();
        }
      }, 0);
    } else if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen, isInputMode, availableItems, _value]);

  // Clear available items when component unmounts or dropdown closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow items to unregister naturally
      const timeoutId = setTimeout(() => {
        setAvailableItems([]);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Add global keyboard listener for search mode
  useEffect(() => {
    if (!isOpen || !isInputMode) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      console.log('🌍 GLOBAL keydown in search mode:', e.key);

      // Only handle navigation keys globally
      if (['ArrowDown', 'ArrowUp', 'Escape'].includes(e.key)) {
        // Create a minimal synthetic event that matches what we need
        const syntheticEvent = {
          key: e.key,
          preventDefault: () => e.preventDefault(),
          defaultPrevented: e.defaultPrevented,
        } as React.KeyboardEvent;
        handleKeyNavigation(syntheticEvent);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, isInputMode, handleKeyNavigation]);

  const ctx = useMemo(
    () => ({
      height,
      invalid,
      disabled,
      testId,
      onSearch,
      isInputMode,
      onItemSelect: handleItemSelect,
      selectedValue: _value,
      setSelectedItemContent,
      focusedIndex,
      availableItems,
      setAvailableItems: updateAvailableItems,
    }),
    [
      height,
      invalid,
      disabled,
      testId,
      onSearch,
      isInputMode,
      _value,
      focusedIndex,
      availableItems,
      updateAvailableItems,
    ],
  );

  return (
    <Context.Provider value={ctx}>
      {/* Hidden container for content registration - always rendered */}
      <div className="sr-only" aria-hidden="true">
        {onSearch ? (
          <ComboboxProvider
            open={false}
            setOpen={() => {}}
            value=""
            defaultSelectedValue=""
            setValue={() => {}}
            setSelectedValue={() => {}}
          >
            <ComboboxList>{children}</ComboboxList>
          </ComboboxProvider>
        ) : (
          children
        )}
      </div>

      <RadixPopover.Root modal open={isOpen} onOpenChange={setOpen}>
        <RadixPopover.Anchor asChild>
          <div ref={containerRef} className="w-full">
            {!isInputMode || !onSearch ? (
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
                onClick={disabled ? undefined : handleContainerClick}
                onKeyDown={
                  disabled
                    ? undefined
                    : e => {
                        console.log('⌨️ HOST keydown:', e.key);
                        handleContainerKeyDown(e);
                      }
                }
              >
                <div className="flex-1 overflow-hidden text-start">
                  {selectedItemContent || (
                    <span className={cnTw('text-footnote text-text-secondary', { 'text-text-tertiary': disabled })}>
                      {placeholder}
                    </span>
                  )}
                </div>
                <Icon name="down" size={16} className="absolute top-1/2 right-1.5 shrink-0 -translate-y-1/2" />
              </div>
            ) : (
              <ComboboxProvider
                open={open}
                setOpen={setOpen}
                value={searchQuery}
                defaultSelectedValue=""
                setValue={handleInputChange}
                setSelectedValue={handleItemSelect}
              >
                <Combobox
                  autoSelect
                  autoFocus
                  ref={comboboxRef}
                  placeholder={placeholder}
                  render={({ onChange, ...props }) => <Input {...props} height={height} onChangeEvent={onChange} />}
                  onBlur={handleInputBlur}
                  onKeyDown={e => {
                    console.log('🔤 COMBOBOX keydown:', e.key);
                    
                    // Handle navigation and selection keys
                    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                      console.log('🚫 COMBOBOX intercepting:', e.key);
                      e.preventDefault();
                      e.stopPropagation();
                      handleKeyNavigation(e);
                      return;
                    }
                  }}
                />
              </ComboboxProvider>
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
              onOpenAutoFocus={e => {
                e.preventDefault();
              }}
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
                  'z-50 flex flex-col',
                  'h-max max-h-(--radix-popper-available-height) min-w-20',
                  'origin-(--radix-popper-transform-origin) overflow-hidden duration-100 animate-in fade-in zoom-in-95',
                  {
                    'border-border-dark bg-background-dark': theme === 'dark',
                  },
                )}
              >
                <ScrollArea>
                  {onSearch && isInputMode ? (
                    <ComboboxProvider
                      open={isOpen}
                      setOpen={setOpen}
                      value={searchQuery}
                      defaultSelectedValue=""
                      setSelectedValue={handleItemSelect}
                    >
                      <ComboboxList ref={listboxRef} role="listbox">
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
                      </ComboboxList>
                    </ComboboxProvider>
                  ) : (
                    <div
                      ref={listboxRef}
                      className="flex flex-col gap-y-1 p-1"
                      tabIndex={0}
                      role="listbox"
                      aria-activedescendant={
                        focusedIndex >= 0 ? `select-item-${availableItems[focusedIndex]}` : undefined
                      }
                      onKeyDown={e => {
                        console.log('📦 LISTBOX keydown:', e.key);
                        handleKeyNavigation(e);
                      }}
                    >
                      {children}
                    </div>
                  )}
                </ScrollArea>
              </Surface>
            </RadixPopover.Content>
          </RadixPopover.Portal>
        )}
      </RadixPopover.Root>
    </Context.Provider>
  );

  // value = '' resets RadixSelect to default and forces placeholder to appear again
  // https://github.com/radix-ui/primitives/issues/1569
};

const Group = ({ title, children }: PropsWithChildren<GroupProps>) => {
  const { onSearch, isInputMode } = useContext(Context);

  if (Children.count(children) === 0) return null;

  const isSearchMode = !!onSearch && isInputMode;

  if (isSearchMode) {
    return (
      <ComboboxGroup className="mb-1 last:mb-0">
        <ComboboxGroupLabel>
          <div className="mb-1 px-3 py-1 text-help-text text-text-secondary">{title}</div>
        </ComboboxGroupLabel>
        {children}
      </ComboboxGroup>
    );
  }

  return (
    <div className="mb-1 last:mb-0">
      <div className="mb-1 px-3 py-1 text-help-text text-text-secondary">{title}</div>
      {children}
    </div>
  );
};

const Item = memo(({ value, depth, children }: PropsWithChildren<ItemProps>) => {
  const { theme } = useTheme();
  const {
    onSearch,
    isInputMode,
    onItemSelect,
    selectedValue,
    setSelectedItemContent,
    focusedIndex,
    availableItems,
    setAvailableItems,
  } = useContext(Context);

  const isSearchMode = !!onSearch && isInputMode;
  const isSelected = selectedValue === value;
  const currentIndex = availableItems.indexOf(value);
  const isFocused = currentIndex === focusedIndex;

  // Debug focus state
  if (isFocused) {
    console.log('🎯 Item focused:', value, { currentIndex, focusedIndex, isFocused });
  }

  // Register this item with the parent for keyboard navigation
  useEffect(() => {
    console.log('📝 Item registering:', value, { isSearchMode });
    setAvailableItems((prev: string[]) => {
      if (!prev.includes(value)) {
        const newItems = [...prev, value];
        console.log('✅ Item registered, new availableItems:', newItems);
        return newItems;
      }
      return prev;
    });

    return () => {
      console.log('🗑️ Item unregistering:', value);
      setAvailableItems((prev: string[]) => prev.filter((item: string) => item !== value));
    };
  }, [value, setAvailableItems]);

  // Register this item's content if it's selected
  useEffect(() => {
    if (isSelected) {
      setSelectedItemContent(children);
    }
  }, [isSelected, children, setSelectedItemContent]);

  const commonClassName = cnTw(
    'flex w-full cursor-pointer rounded-sm px-3 py-2 text-footnote text-text-secondary contain-inline-size',
    'focus:bg-action-background-hover focus:outline-hidden',
    {
      'text-text-tertiary focus:bg-block-background-hover': theme === 'dark',
      'bg-action-background-hover': isFocused && theme === 'light',
      'bg-background-item-hover': isFocused && theme === 'dark',
    },
  );

  const commonStyle = depth
    ? {
        paddingLeft: `${gridSpaceConverter((depth + 1) * 4)}px`,
      }
    : void 0;

  if (isSearchMode) {
    return (
      <ComboboxItem
        focusOnHover
        value={value}
        className={cnTw(commonClassName, 'data-active-item:bg-action-background-hover', {
          'data-active-item:bg-background-item-hover': theme === 'dark',
        })}
        style={commonStyle}
      >
        <div className="h-full w-full truncate">{children}</div>
      </ComboboxItem>
    );
  }

  // For non-search mode, use a regular div with click handler
  return (
    <div
      id={`select-item-${value}`}
      className={cnTw(commonClassName, 'hover:bg-action-background-hover', {
        'hover:bg-background-item-hover': theme === 'dark',
      })}
      style={commonStyle}
      role="option"
      aria-selected={isSelected}
      data-focused={isFocused}
      onClick={() => onItemSelect(value)}
    >
      <div className="h-full w-full truncate">{children}</div>
    </div>
  );
});

Item.displayName = 'SelectItem';

export const Select = Object.assign(Root, {
  Group,
  Item,
});
