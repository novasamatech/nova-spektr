import {
  Combobox,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxItem,
  ComboboxList,
  ComboboxPopover,
  ComboboxProvider,
} from '@ariakit/react';
import { isNil } from 'lodash';
import {
  Children,
  type PropsWithChildren,
  type ReactNode,
  createContext,
  memo,
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
import { Graphics } from '../Graphics/Graphics';
import { useTheme } from '../Theme/useTheme';

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
};

const Context = createContext<ContextProps>({
  onItemSelect: () => {},
  setSelectedItemContent: () => {},
  registerItem: () => {},
  unregisterItem: () => {},
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
  value,
  onChange,
  onSearch,
  children,
}: RootProps<T>) => {
  const { t } = useI18n();

  const { theme } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [selectedItemContent, setSelectedItemContent] = useState<ReactNode>(null);
  const [registeredItems, setRegisteredItems] = useState<Map<string, ReactNode>>(new Map());
  const [isOpen, setIsOpen] = useState(false);

  const onOpenChange = (requestedOpen: boolean) => {
    // If external open prop is true, prevent closing
    if (open === true && !requestedOpen) {
      return; // Don't allow closing when controlled open is true
    }

    setSearchValue('');
    setIsOpen(requestedOpen);
    onToggle?.(requestedOpen);
    onSearch?.('');
  };

  useEffect(() => {
    if (!isNil(open)) {
      const timeoutId = setTimeout(() => {
        onOpenChange(open);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

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
      invalid,
      disabled,
      height,
      testId,
      onSearch,
      onItemSelect: (value: string) => {
        onChange?.(value as T);
        onOpenChange(false);
      },
      selectedValue: value,
      setSelectedItemContent,
      registerItem,
      unregisterItem,
      searchQuery: onSearch ? searchValue : '',
    }),
    [invalid, disabled, height, testId, onSearch, onChange, value, searchValue, registerItem, unregisterItem],
  );

  return (
    <Context.Provider value={contextValue}>
      <ComboboxProvider
        open={isOpen}
        value={onSearch ? searchValue : ''}
        setValue={value => {
          if (onSearch) {
            setSearchValue(value);
            onSearch(value);
          }
        }}
      >
        {!isOpen ? (
          <button
            className={cnTw(
              'box-border flex items-center rounded-sm border border-filter-border bg-input-background px-2 text-text-secondary',
              'w-full text-left text-footnote focus-within:border-active-container-border hover:shadow-card-shadow',
              {
                'h-8.5': height === 'sm',
                'h-10.5': height === 'md',
                'border-filter-border bg-input-background text-text-primary': theme === 'light',
                'border-border-dark bg-background-dark text-white': theme === 'dark',
                'bg-input-background-disabled text-text-tertiary': disabled,
                'border-filter-border-negative': invalid,
              },
            )}
            onClick={() => {
              !disabled && onOpenChange(true);
            }}
          >
            {selectedItemContent || <span className="text-text-secondary">{placeholder}</span>}
          </button>
        ) : (
          <Combobox
            autoFocus
            placeholder={placeholder}
            readOnly={!onSearch}
            className={cnTw(
              'min-h-[34px] w-full rounded-md border-none px-2 leading-6 outline-1 placeholder:text-text-secondary focus-visible:outline-2 dark:text-white',
              { 'h-8.5': height === 'sm', 'h-10.5': height === 'md' },
              { 'cursor-default': !onSearch },
            )}
            onBlur={() => {
              onOpenChange(false);
            }}
          />
        )}
        <ComboboxPopover
          gutter={8}
          sameWidth
          className="relative z-50 flex flex-col overflow-auto overscroll-contain rounded-lg border border-slate-300 bg-white p-2"
        >
          {children}
          {registeredItems.size === 0 && (
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
        <div className="px-1 pt-1 text-help-text text-text-secondary">{title}</div>
      </ComboboxGroupLabel>
      <div className="pl-4">
        <ComboboxList>{children}</ComboboxList>
      </div>
    </ComboboxGroup>
  );
};

const Item = memo(({ value, depth, children }: PropsWithChildren<ItemProps>) => {
  const { selectedValue, setSelectedItemContent, registerItem, unregisterItem, onItemSelect } = useContext(Context);

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

  const commonStyle = depth
    ? {
        paddingLeft: `${(depth + 1) * 16}px`,
      }
    : undefined;

  return (
    <ComboboxItem
      focusOnHover
      clickOnSpace={true}
      clickOnEnter={true}
      value={value}
      className="flex cursor-default scroll-m-2 items-center gap-2 rounded px-2 py-2 outline-none hover:bg-blue-500/40 data-[active]:pb-[7px] data-[active-item]:bg-tab-background data-[active-item]:outline-2 dark:hover:bg-blue-500/25 dark:data-[active-item]:bg-blue-600"
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
