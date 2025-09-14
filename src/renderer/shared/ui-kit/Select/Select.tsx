import {
  Combobox,
  ComboboxDisclosure,
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
  useRef,
  useState,
} from 'react';

import { type XOR } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, truncate } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Graphics } from '../Graphics/Graphics';
import { useTheme } from '../Theme/useTheme';

type ContextProps = {
  onItemSelect: (value: string) => void;
  registerItem: (value: string, content: ReactNode) => void;
  unregisterItem: (value: string) => void;
};

const Context = createContext<ContextProps>({
  onItemSelect: () => {},
  registerItem: () => {},
  unregisterItem: () => {},
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
    onSearch?: (query: string) => void;
  }
>;

type ItemProps = PropsWithChildren<{
  value: string;
  indent?: number;
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
  valueNode,
  value,
  onChange,
  onSearch,
  children,
}: RootProps<T>) => {
  const { t } = useI18n();

  const { theme } = useTheme();
  const triggerRef = useRef<HTMLButtonElement>(null);
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

    setTimeout(() => {
      // Restore focus to trigger button when closing
      if (!requestedOpen) {
        triggerRef.current?.focus();
      }
    }, 0);
  };

  useEffect(() => {
    if (!isNil(open)) {
      const timeoutId = setTimeout(() => {
        onOpenChange(open);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  useEffect(() => {
    if (value && registeredItems.has(value)) {
      setSelectedItemContent(registeredItems.get(value));
    } else if (!value) {
      setSelectedItemContent(null);
    }
  }, [value, registeredItems]);

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
          <ComboboxDisclosure clickOnEnter={true} clickOnSpace={true} className="w-full rounded-md">
            <button
              ref={triggerRef}
              className={cnTw(
                'box-border cursor-pointer border px-2.75 text-text-secondary',
                'w-full rounded-md text-left text-footnote hover:shadow-card-shadow',
                {
                  'h-8.5': height === 'sm',
                  'h-10.5': height === 'md',
                  'border-filter-border bg-input-background text-text-primary': theme === 'light',
                  'border-border-dark bg-background-dark text-white': theme === 'dark',
                  'cursor-not-allowed bg-input-background-disabled text-text-tertiary': disabled,
                  'border-filter-border-negative': invalid,
                },
              )}
              disabled={disabled}
              onClick={() => {
                !disabled && onOpenChange(true);
              }}
            >
              {valueNode || selectedItemContent || <span className="text-text-secondary">{placeholder}</span>}
            </button>
          </ComboboxDisclosure>
        ) : (
          <Combobox
            autoFocus
            placeholder={placeholder}
            readOnly={!onSearch}
            className={cnTw(
              'min-h-[34px] w-full rounded-md border-none px-3 outline-1 placeholder:text-footnote placeholder:text-text-secondary focus-visible:outline-2',
              { 'h-10.5': height === 'md' },
              { 'cursor-default': !onSearch },
            )}
            onBlur={() => {
              setTimeout(() => {
                onOpenChange(false);
              }, 100);
            }}
          />
        )}
        <ComboboxPopover
          gutter={8}
          sameWidth
          portal
          className={cnTw(
            'pointer-events-auto relative z-[9999]', // necessary for proper render in portal
            'text-body', // duplicate of the root rule bc the content will be rendered outside
            'flex max-h-[300px] flex-col overflow-auto overscroll-contain rounded-md border p-1 shadow-lg',
            {
              'border-filter-border bg-input-background': theme === 'light',
              'border-border-dark bg-background-dark': theme === 'dark',
            },
          )}
          data-theme={theme}
        >
          {children}
          {registeredItems.size === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-2 py-6">
              <Graphics name="emptyList" size={64} />
              <FootnoteText className="text-text-tertiary">
                {t('emptyState.searchEmpty', { query: truncate(searchValue, 5, 5) })}
              </FootnoteText>
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
        <div className="px-3 py-1 text-help-text text-text-secondary">{title}</div>
      </ComboboxGroupLabel>
      <ComboboxList>{children}</ComboboxList>
    </ComboboxGroup>
  );
};

const Item = memo(({ value, indent = 0, children }: PropsWithChildren<ItemProps>) => {
  const { registerItem, unregisterItem, onItemSelect } = useContext(Context);
  const { theme } = useTheme();

  // Register this item on mount and update when children change
  useEffect(() => {
    registerItem(value, children);
    return () => unregisterItem(value);
  }, [value, children, registerItem, unregisterItem]);

  const paddingLeft = indent > 0 ? `${24 + indent * 16}px` : undefined;
  const itemStyle = paddingLeft ? { paddingLeft } : undefined;

  return (
    <ComboboxItem
      focusOnHover
      clickOnSpace={true}
      clickOnEnter={true}
      value={value}
      className={cnTw(
        'flex cursor-pointer scroll-m-2 items-center gap-2 rounded p-2 outline-none data-[active-item]:outline-2',
        {
          'hover:bg-action-background-hover data-[active-item]:bg-tab-background': theme === 'light',
          'text-text-tertiary hover:bg-background-item-hover data-[active-item]:bg-background-item-hover':
            theme === 'dark',
        },
      )}
      style={itemStyle}
      onClick={() => onItemSelect(value)}
    >
      {children}
    </ComboboxItem>
  );
});

Item.displayName = 'SelectItem';

export const Select = Object.assign(Root, {
  Group,
  Item,
});
