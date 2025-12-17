import * as RadixPopover from '@radix-ui/react-popover';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Checkbox, useTheme } from '@/shared/ui-kit';
import { Icon } from '../../Icon/Icon';
import { CaptionText, FootnoteText, LabelText } from '../../Typography';
import { OptionStyle, OptionStyleTheme, OptionsContainerStyleTheme, SelectButtonStyle } from '../common/constants';
import { type DropdownOption, type DropdownResult, type Theme } from '../common/types';

type Props = {
  className?: string;
  placeholder: string;
  multiPlaceholder?: string;
  searchPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  selectedIds?: DropdownOption['id'][];
  options: DropdownOption[];
  tabIndex?: number;
  theme?: Theme;
  showSelectAll?: boolean;
  onChange: (data: DropdownResult[]) => void;
  onSearch?: (query: string) => void;
};

export const MultiSelect = ({
  className,
  placeholder,
  multiPlaceholder,
  searchPlaceholder,
  label,
  disabled,
  invalid,
  selectedIds = [],
  options,
  onChange,
  onSearch,
  tabIndex,
  theme = 'light',
  showSelectAll = false,
}: Props) => {
  const { t } = useI18n();
  const id = useId();
  const { portalContainer } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      setSearchQuery('');
      onSearch?.('');
    }
  }, [isOpen]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedIds?.includes(option.id)),
    [options, selectedIds],
  );

  const allSelected = options.length > 0 && options.every((option) => selectedIds.includes(option.id));

  const getSelectButtonElement = () => {
    if (selectedOptions.length === 0) {
      return (
        <FootnoteText as="span" className="text-text-secondary">
          {placeholder}
        </FootnoteText>
      );
    }

    if (selectedOptions.length === 1) {
      return typeof selectedOptions[0].element === 'string' ? (
        <FootnoteText as="span" className="truncate">
          {selectedOptions[0].element}
        </FootnoteText>
      ) : (
        selectedOptions[0].element
      );
    }

    return (
      <span className="flex items-center gap-x-2">
        <FootnoteText as="span">{multiPlaceholder || placeholder}</FootnoteText>
        <CaptionText as="span" className="h-4 rounded-[30px] bg-icon-accent px-1.5 leading-4 text-white" align="center">
          {selectedOptions.length}
        </CaptionText>
      </span>
    );
  };

  const handleOptionClick = (option: DropdownOption) => {
    const isSelected = selectedIds.includes(option.id);
    let newSelection: DropdownResult[];

    if (isSelected) {
      newSelection = selectedOptions.filter((o) => o.id !== option.id).map((o) => ({ id: o.id, value: o.value }));
    } else {
      newSelection = [...selectedOptions, option].map((o) => ({ id: o.id, value: o.value }));
    }

    onChange(newSelection);
  };

  const handleSelectAllClick = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map((o) => ({ id: o.id, value: o.value })));
    }
  };

  const selectElement = (
    <RadixPopover.Root open={isOpen} onOpenChange={setIsOpen}>
      <div ref={containerRef} className={cnTw('relative', className)}>
        <RadixPopover.Trigger asChild>
          <button
            id={id}
            className={cnTw(
              SelectButtonStyle[theme].closed,
              invalid && SelectButtonStyle[theme].invalid,
              SelectButtonStyle[theme].disabled,
              'inline-flex w-full cursor-pointer items-center justify-between gap-x-2 py-2 pr-2 text-start',
              'rounded-sm border bg-input-background px-3 py-[7px]',
              'text-footnote text-text-primary outline-offset-1',
              isOpen && onSearch && 'invisible',
            )}
            disabled={disabled}
            tabIndex={tabIndex}
            type="button"
          >
            {getSelectButtonElement()}
            <Icon name={isOpen ? 'up' : 'down'} size={16} />
          </button>
        </RadixPopover.Trigger>

        {isOpen && onSearch && (
          <div className="absolute inset-0">
            <input
              ref={inputRef}
              className={cnTw(
                'h-full w-full rounded-sm border bg-input-background px-3 py-[7px] pr-8',
                'text-footnote text-text-primary placeholder:text-text-secondary',
                'focus:border-active-container-border focus:outline-none',
                SelectButtonStyle[theme].open,
              )}
              placeholder={searchPlaceholder || t('general.input.searchPlaceholder')}
              type="text"
              value={searchQuery}
              onBlur={(e) => {
                // Don't close if focus is moving to an element inside the container or popover
                const relatedTarget = e.relatedTarget as Node | null;
                if (relatedTarget) {
                  const popoverContent = document.querySelector('[data-radix-popper-content-wrapper]');
                  if (containerRef.current?.contains(relatedTarget) || popoverContent?.contains(relatedTarget)) {
                    return;
                  }
                }
                setIsOpen(false);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch(e.target.value);
              }}
            />
            <div className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
              <Icon name="up" size={16} />
            </div>
          </div>
        )}

        <RadixPopover.Portal container={portalContainer}>
          <RadixPopover.Content
            align="start"
            sideOffset={4}
            className={cnTw(
              'z-50 max-h-60 overflow-auto rounded-sm border px-1 py-1 shadow-card-shadow',
              'w-[var(--radix-popover-trigger-width)]',
              OptionsContainerStyleTheme[theme],
            )}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              // Don't close if interacting with the search input
              if (containerRef.current?.contains(e.target as Node)) {
                e.preventDefault();
              }
            }}
          >
            {showSelectAll && options.length > 0 && (
              <>
                <div
                  role="option"
                  aria-selected={allSelected}
                  className={cnTw(
                    OptionStyle,
                    OptionStyleTheme[theme](false, false),
                    'w-full cursor-pointer text-left',
                  )}
                  tabIndex={0}
                  onClick={handleSelectAllClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAllClick();
                    }
                  }}
                >
                  <div
                    className={cnTw(
                      'pointer-events-none w-full',
                      allSelected ? 'text-text-primary' : 'text-text-secondary',
                    )}
                  >
                    <Checkbox checked={allSelected}>{t('general.input.selectAll')}</Checkbox>
                  </div>
                </div>

                <hr className="my-1 border-divider" />
              </>
            )}

            {options.length === 0 && (
              <div className="px-2 py-3 text-center">
                <FootnoteText className="text-text-tertiary">{t('general.input.nothingFound')}</FootnoteText>
              </div>
            )}

            {options.map(({ id: optionId, value, element }) => {
              const isSelected = selectedIds.includes(optionId);

              return (
                <div
                  key={optionId}
                  role="option"
                  aria-selected={isSelected}
                  className={cnTw(
                    OptionStyle,
                    OptionStyleTheme[theme](false, false),
                    'w-full cursor-pointer text-left',
                  )}
                  tabIndex={0}
                  onClick={() => handleOptionClick({ id: optionId, value, element })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOptionClick({ id: optionId, value, element });
                    }
                  }}
                >
                  <div
                    className={cnTw(
                      'pointer-events-none w-full',
                      isSelected ? 'text-text-primary' : 'text-text-secondary',
                    )}
                  >
                    <Checkbox checked={isSelected}>{element}</Checkbox>
                  </div>
                </div>
              );
            })}
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </div>
    </RadixPopover.Root>
  );

  if (!label) {
    return selectElement;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <LabelText className="cursor-pointer text-text-tertiary" htmlFor={id}>
        {label}
      </LabelText>
      {selectElement}
    </div>
  );
};
