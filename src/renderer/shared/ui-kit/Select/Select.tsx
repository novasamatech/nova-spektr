import {
  Combobox,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxItem,
  ComboboxList,
  ComboboxPopover,
  ComboboxProvider,
} from '@ariakit/react';
import React, {
  Children,
  type PropsWithChildren,
  type ReactNode,
  createContext,
  memo,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { type XOR } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
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
};

const Context = createContext<ContextProps>({
  onItemSelect: () => {},
  setSelectedItemContent: () => {},
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
  const [searchValue, setSearchValue] = useState('');
  const list = [
    'Apple',
    'Bacon',
    'Banana',
    'Broccoli',
    'Burger',
    'Cake',
    'Candy',
    'Carrot',
    'Cherry',
    'Chocolate',
    'Cookie',
    'Cucumber',
    'Donut',
    'Fish',
    'Fries',
    'Grape',
    'Green apple',
    'Hot dog',
    'Ice cream',
    'Kiwi',
    'Lemon',
    'Lollipop',
    'Onion',
    'Orange',
    'Pasta',
    'Pineapple',
    'Pizza',
    'Potato',
    'Salad',
    'Sandwich',
    'Steak',
    'Strawberry',
    'Tomato',
    'Watermelon',
  ];
  const matches = useMemo(() => list.filter(i => i.includes(searchValue)), [searchValue]);
  return (
    <ComboboxProvider
      setValue={value => {
        startTransition(() => setSearchValue(value));
      }}
    >
      <Combobox
        placeholder="e.g., Apple"
        className="h-10 w-64 rounded-md border-none bg-white pr-4 pl-4 text-base leading-6 text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15),inset_0_2px_5px_0_rgba(0,0,0,0.08)] outline-1 outline-offset-[-1px] outline-blue-600 placeholder:text-black/60 hover:bg-blue-50 focus-visible:outline-2 data-[active-item]:outline-2 dark:bg-slate-800 dark:text-white dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15),inset_0_-1px_0_0_rgba(255,255,255,0.05),inset_0_2px_5px_0_rgba(0,0,0,0.15)] dark:placeholder:text-white/46 dark:hover:bg-slate-900"
      />
      <ComboboxPopover
        gutter={8}
        sameWidth
        className="relative z-50 flex max-h-[min(var(--popover-available-height,300px),300px)] flex-col overflow-auto overscroll-contain rounded-lg border border-slate-300 bg-white p-2 text-black shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] outline-2 outline-offset-2 outline-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.25),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        {matches.length ? (
          matches.map(value => (
            <ComboboxItem
              key={value}
              value={value}
              className="flex cursor-default scroll-m-2 items-center gap-2 rounded px-2 py-2 outline-none hover:bg-blue-500/40 active:pt-[9px] active:pb-[7px] data-[active]:pt-[9px] data-[active]:pb-[7px] data-[active-item]:bg-blue-600 data-[active-item]:text-white dark:hover:bg-blue-500/25 dark:data-[active-item]:bg-blue-600"
            />
          ))
        ) : (
          // eslint-disable-next-line i18next/no-literal-string
          <div className="gap-2 p-2">No results found</div>
        )}
      </ComboboxPopover>
    </ComboboxProvider>
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
  const { theme } = useTheme();
  const { selectedValue, setSelectedItemContent } = useContext(Context);

  const isSelected = selectedValue === value;

  // Register this item's content if it's selected
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
      value={value}
      className={cnTw(
        'flex w-full cursor-default items-center gap-2 rounded-sm px-3 py-2 text-footnote text-text-secondary',
        'data-[focus-visible]:bg-action-background-hover data-[focus-visible]:outline-none',
        {
          'text-text-tertiary data-[focus-visible]:bg-background-item-hover': theme === 'dark',
        },
      )}
      style={commonStyle}
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
