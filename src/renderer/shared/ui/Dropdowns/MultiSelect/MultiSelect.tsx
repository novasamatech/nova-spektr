import * as RadixPopover from '@radix-ui/react-popover';
import { useId, useMemo, useState } from 'react';

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
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  selectedIds?: DropdownOption['id'][];
  options: DropdownOption[];
  tabIndex?: number;
  theme?: Theme;
  showSelectAll?: boolean;
  onChange: (data: DropdownResult[]) => void;
};

export const MultiSelect = ({
  className,
  placeholder,
  multiPlaceholder,
  label,
  disabled,
  invalid,
  selectedIds = [],
  options,
  onChange,
  tabIndex,
  theme = 'light',
  showSelectAll = false,
}: Props) => {
  const { t } = useI18n();
  const id = useId();
  const { portalContainer } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedIds?.includes(option.id)),
    [options, selectedIds],
  );

  const allSelected = options.length > 0 && selectedOptions.length === options.length;

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
      <div className={cnTw('relative', className)}>
        <RadixPopover.Trigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cnTw(
              isOpen && SelectButtonStyle[theme].open,
              !isOpen && !invalid && SelectButtonStyle[theme].closed,
              invalid && SelectButtonStyle[theme].invalid,
              SelectButtonStyle[theme].disabled,
              'inline-flex w-full cursor-pointer items-center justify-between gap-x-2 py-2 pr-2 text-start',
              'rounded-sm border bg-input-background px-3 py-[7px]',
              'text-footnote text-text-primary outline-offset-1',
            )}
            tabIndex={tabIndex}
          >
            {getSelectButtonElement()}
            <Icon name={isOpen ? 'up' : 'down'} size={16} />
          </button>
        </RadixPopover.Trigger>

        <RadixPopover.Portal container={portalContainer}>
          <RadixPopover.Content
            align="start"
            sideOffset={4}
            className={cnTw(
              'z-50 max-h-60 overflow-auto rounded-sm border px-1 py-1 shadow-card-shadow',
              'w-[var(--radix-popover-trigger-width)]',
              OptionsContainerStyleTheme[theme],
            )}
          >
            {showSelectAll && (
              <>
                <div
                  role="option"
                  aria-selected={allSelected}
                  className={cnTw(OptionStyle, OptionStyleTheme[theme](false, false), 'w-full cursor-pointer text-left')}
                  onClick={handleSelectAllClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAllClick();
                    }
                  }}
                  tabIndex={0}
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

            {options.map(({ id: optionId, value, element }) => {
              const isSelected = selectedIds.includes(optionId);

              return (
                <div
                  key={optionId}
                  role="option"
                  aria-selected={isSelected}
                  className={cnTw(OptionStyle, OptionStyleTheme[theme](false, false), 'w-full cursor-pointer text-left')}
                  onClick={() => handleOptionClick({ id: optionId, value, element })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOptionClick({ id: optionId, value, element });
                    }
                  }}
                  tabIndex={0}
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
