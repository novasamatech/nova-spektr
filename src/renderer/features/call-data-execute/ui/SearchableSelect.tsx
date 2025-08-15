import * as Ariakit from '@ariakit/react';
import * as RadixPopover from '@radix-ui/react-popover';
import { type ReactNode, memo, startTransition, useRef, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Input, ScrollArea, Surface, ThemeProvider, useTheme } from '@/shared/ui-kit';
import { gridSpaceConverter } from '@/shared/ui-kit/_helpers/gridSpaceConverter';

type SearchableSelectProps = {
  placeholder: string;
  value: string | null;
  valueNode: ReactNode;
  height: 'sm' | 'md';
  testId?: string;
  onSearch: (query: string) => void;
  onChange: (value: string) => void;
  children: ReactNode;
};

export const SearchableSelect = ({
  placeholder,
  value: _value,
  valueNode,
  height,
  testId = 'SearchableSelect',
  onSearch,
  onChange,
  children,
}: SearchableSelectProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const comboboxRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputMode, setIsInputMode] = useState(false);
  const { portalContainer } = useTheme();

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
      onChange(itemValue);
      setIsInputMode(false);
      setOpen(false);
      setSearchQuery('');
      onSearch('');
    });
  };

  return (
    <ThemeProvider preferStaticContent>
      <RadixPopover.Root modal open={open} onOpenChange={setOpen}>
        <RadixPopover.Anchor asChild>
          <div ref={containerRef} className="w-full">
            {!isInputMode ? (
              <div
                className={cnTw(
                  'border-input flex w-full cursor-pointer items-center rounded-md border border-filter-border px-2 py-1 text-footnote',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                )}
                tabIndex={0}
                onClick={handleContainerFocus}
                onFocus={handleContainerFocus}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleContainerFocus();
                  }
                }}
              >
                {valueNode || <span className="text-muted-foreground">{placeholder}</span>}
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

        {open && containerRef.current && (
          <RadixPopover.Portal container={portalContainer}>
            <RadixPopover.Content
              asChild
              hideWhenDetached
              data-testid={testId}
              style={{ width: `${containerRef.current.getBoundingClientRect().width}px` }}
              collisionPadding={gridSpaceConverter(2)}
              sideOffset={gridSpaceConverter(2)}
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
                  'z-50 flex h-max max-h-(--radix-popper-available-height) flex-col p-1',
                  'overflow-hidden duration-100 animate-in fade-in zoom-in-95',
                )}
              >
                <ScrollArea>
                  {isInputMode && (
                    <Ariakit.ComboboxProvider
                      open={open}
                      setOpen={setOpen}
                      value={searchQuery}
                      defaultSelectedValue=""
                      setValue={handleInputChange}
                      setSelectedValue={handleItemSelect}
                    >
                      <Ariakit.ComboboxList ref={listboxRef} role="listbox">
                        {children}
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
  );
};

type SearchableSelectGroupProps = {
  title: ReactNode;
  children: ReactNode;
};

export const SearchableSelectGroup = ({ title, children }: SearchableSelectGroupProps) => {
  return (
    <Ariakit.ComboboxGroup className="mb-1 last:mb-0">
      <Ariakit.ComboboxGroupLabel>
        <div className="mb-1 px-2 py-1 text-help-text text-text-secondary">{title}</div>
      </Ariakit.ComboboxGroupLabel>
      {children}
    </Ariakit.ComboboxGroup>
  );
};

type SearchableSelectItemProps = {
  value: string;
  children: ReactNode;
};

export const SearchableSelectItem = memo(({ value, children }: SearchableSelectItemProps) => {
  return (
    <Ariakit.ComboboxItem
      focusOnHover
      value={value}
      className={cnTw(
        'flex cursor-pointer rounded-sm px-2 py-1 text-footnote text-text-secondary',
        'bg-block-background-default data-active-item:bg-block-background-hover',
        'mb-1 last:mb-0',
      )}
    >
      {children}
    </Ariakit.ComboboxItem>
  );
});

SearchableSelectItem.displayName = 'SearchableSelectItem';
