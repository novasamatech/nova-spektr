import {
  Combobox,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxItem,
  ComboboxList,
  ComboboxPopover,
  ComboboxProvider,
} from '@ariakit/react';
import {
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
  useState,
} from 'react';

import { type XOR } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { useTheme } from '@/shared/ui-kit';
import { Graphics } from '../Graphics/Graphics';

type ContextProps = {
  invalid?: boolean;
  disabled?: boolean;
  height?: 'sm' | 'md';
  testId?: string;
  onSearch?: (query: string) => void;
  onItemSelect: (value: string) => void;
  selectedValue?: string | null;
  setSelectedItemContent: (content: ReactNode) => void;
  registerItem: (value: string, content: ReactNode) => void;
  unregisterItem: (value: string) => void;
  searchQuery: string;
};

const Context = createContext<ContextProps>({
  onItemSelect: () => {},
  setSelectedItemContent: () => {},
  registerItem: () => {},
  unregisterItem: () => {},
  searchQuery: '',
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
  invalid: _invalid,
  disabled: _disabled,
  testId: _testId = 'Select',
  height: _height = 'sm',
  open: _open,
  onToggle: _onToggle,
  placeholder: _placeholder,
  value: _value,
  onChange: _onChange,
  onSearch: _onSearch,
  children: _children,
}: RootProps<T>) => {
  const { t } = useI18n();

  const { theme } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [selectedItemContent, setSelectedItemContent] = useState<ReactNode>(null);
  const [registeredItems, setRegisteredItems] = useState<Map<string, ReactNode>>(new Map());
  const [isOpen, setIsOpen] = useState(false);

  const registerItem = useCallback((value: string, content: ReactNode) => {
    setRegisteredItems(prev => new Map(prev.set(value, content)));
  }, []);

  const unregisterItem = useCallback((value: string) => {
    setRegisteredItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(value);
      return newMap;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      invalid: _invalid,
      disabled: _disabled,
      height: _height,
      testId: _testId,
      onSearch: _onSearch,
      onItemSelect: (value: string) => {
        _onChange?.(value as T);
        setIsOpen(false);
      },
      selectedValue: _value,
      setSelectedItemContent,
      registerItem,
      unregisterItem,
      searchQuery: searchValue,
    }),
    [_invalid, _disabled, _height, _testId, _onSearch, _onChange, _value, searchValue, registerItem, unregisterItem],
  );

  const filteredItems = useMemo(() => {
    if (!searchValue) return Array.from(registeredItems.entries());
    return Array.from(registeredItems.entries()).filter(([value]) =>
      value.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [registeredItems, searchValue]);
  return (
    <Context.Provider value={contextValue}>
      <ComboboxProvider
        open={isOpen}
        setOpen={setIsOpen}
        setValue={value => {
          startTransition(() => setSearchValue(value));
          if (_onSearch) {
            _onSearch(value);
          }
        }}
      >
        {!isOpen ? (
          // Closed state - show selected item or placeholder
          <div
            className={cnTw(
              'box-border flex items-center gap-x-2 rounded-sm border border-filter-border bg-input-background px-[11px] text-text-secondary',
              'text-footnote focus-within:border-active-container-border hover:shadow-card-shadow',
              {
                'h-8.5': _height === 'sm',
                'h-10.5': _height === 'md',
                'border-filter-border bg-input-background text-text-primary': theme === 'light',
                'border-border-dark bg-background-dark text-white': theme === 'dark',
                'bg-input-background-disabled text-text-tertiary': _disabled,
                'border-filter-border-negative': _invalid,
              },
            )}
            onClick={() => !_disabled && setIsOpen(true)}
          >
            {selectedItemContent || <span className="text-black/60 dark:text-white/46">{_placeholder}</span>}
          </div>
        ) : (
          // Open state - show input
          <Combobox
            autoFocus
            placeholder={_placeholder}
            className={cnTw(
              'min-h-[34px] w-full rounded-md border-none px-4 leading-6 text-black outline-1 placeholder:text-text-secondary focus-visible:outline-2 dark:text-white',
              { 'h-8.5': _height === 'sm', 'h-10.5': _height === 'md' },
            )}
            onBlur={() => {
              setIsOpen(false);
            }}
          />
        )}
        <ComboboxPopover
          gutter={8}
          sameWidth
          className="relative z-50 flex max-h-[min(var(--popover-available-height,300px),300px)] flex-col overflow-auto overscroll-contain rounded-lg border border-slate-300 bg-white p-2"
        >
          {_children}
          {filteredItems.length === 0 && registeredItems.size > 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-2 py-6">
              <Graphics name="emptyList" size={64} />
              <FootnoteText className="text-text-tertiary">{t('emptyState.accountsNotFound')}</FootnoteText>
            </div>
          )}
        </ComboboxPopover>
      </ComboboxProvider>
    </Context.Provider>
  );
};

const Group = ({ title, children }: PropsWithChildren<GroupProps>) => {
  if (Children.count(children) === 0) return null;

  return (
    <ComboboxGroup className="mb-1 last:mb-0">
      <ComboboxGroupLabel>
        <div className="mb-1 px-3 py-1 text-help-text text-text-secondary">{title}</div>
      </ComboboxGroupLabel>
      <ComboboxList>{children}</ComboboxList>
    </ComboboxGroup>
  );
};

const Item = memo(({ value, depth, children }: PropsWithChildren<ItemProps>) => {
  const { selectedValue, setSelectedItemContent, registerItem, unregisterItem, onItemSelect, searchQuery } =
    useContext(Context);

  const isSelected = selectedValue === value;

  // Register this item on mount and update when children change
  useEffect(() => {
    registerItem(value, children);
    return () => unregisterItem(value);
  }, [value, children, registerItem, unregisterItem]);

  // Set selected item content when selected
  useEffect(() => {
    if (isSelected) {
      setSelectedItemContent(children);
    }
  }, [isSelected, children, setSelectedItemContent]);

  // Filter out items that don't match search
  const shouldShow = !searchQuery || value.toLowerCase().includes(searchQuery.toLowerCase());

  if (!shouldShow) {
    return null;
  }

  const commonStyle = depth
    ? {
        paddingLeft: `${(depth + 1) * 16}px`,
      }
    : undefined;

  return (
    <ComboboxItem
      focusOnHover
      value={value}
      className="flex cursor-default scroll-m-2 items-center gap-2 rounded px-2 py-2 outline-none hover:bg-blue-500/40 active:pt-[9px] active:pb-[7px] data-[active]:pt-[9px] data-[active]:pb-[7px] data-[active-item]:bg-blue-600 data-[active-item]:text-white data-[active-item]:outline-2 dark:hover:bg-blue-500/25 dark:data-[active-item]:bg-blue-600"
      style={commonStyle}
      onClick={() => onItemSelect(value)}
    >
      <div className="h-full w-full truncate">{children}</div>
    </ComboboxItem>
  );
});

Item.displayName = 'SelectItem';

export const Select = Object.assign(Root, {
  Group,
  Item,
});
