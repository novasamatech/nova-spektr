import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useId } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Checkbox } from '@/shared/ui-kit';
import { Icon } from '../../Icon/Icon';
import { CaptionText, FootnoteText, LabelText } from '../../Typography';
import {
  OptionStyle,
  OptionStyleTheme,
  OptionsContainerStyle,
  OptionsContainerStyleTheme,
  SelectButtonStyle,
  ViewClass,
} from '../common/constants';
import { type DropdownOption, type DropdownResult, type Position, type Theme } from '../common/types';

type Props = {
  className?: string;
  placeholder: string;
  multiPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  selectedIds?: DropdownOption['id'][];
  options: DropdownOption[];
  position?: Position;
  tabIndex?: number;
  theme?: Theme;
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
  position = 'down',
  tabIndex,
  theme = 'light',
}: Props) => {
  const id = useId();
  const selectedOptions = options.filter((option) => selectedIds?.includes(option.id));

  const getSelectButtonElement = () => {
    // if one option selected we show that option
    // otherwise we show placeholder and selected options count (if not 0)
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

  const selectElement = (
    <Listbox multiple by="id" disabled={disabled} value={selectedOptions} onChange={onChange}>
      {({ open }) => (
        <div className={cnTw('relative', className)}>
          <Listbox.Button
            id={id}
            className={cnTw(
              open && SelectButtonStyle[theme].open,
              !open && !invalid && SelectButtonStyle[theme].closed,
              invalid && SelectButtonStyle[theme].invalid,
              SelectButtonStyle[theme].disabled,
              'inline-flex w-full items-center justify-between gap-x-2 py-2 pr-2 text-start',
              'rounded border bg-input-background px-3 py-[7px]',
              'text-footnote text-text-primary outline-offset-1',
            )}
            tabIndex={tabIndex}
          >
            {getSelectButtonElement()}
            <Icon name={open ? 'up' : 'down'} size={16} />
          </Listbox.Button>

          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options
              className={cnTw(
                OptionsContainerStyle,
                OptionsContainerStyleTheme[theme],
                position !== 'auto' && ViewClass[position],
              )}
            >
              {options.map(({ id, value, element }) => (
                <Listbox.Option
                  key={id}
                  value={{ id, value }}
                  className={({ active }) => cnTw(OptionStyle, OptionStyleTheme[theme](active, false))}
                >
                  {({ selected }) => (
                    <div
                      className={cnTw(
                        'pointer-events-none w-full',
                        selected ? 'text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      <Checkbox checked={selected}>{element}</Checkbox>
                    </div>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
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
