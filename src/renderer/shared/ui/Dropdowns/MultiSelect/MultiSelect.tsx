import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useId } from 'react';

import { cnTw } from '@shared/lib/utils';
import { Icon, Checkbox, FootnoteText, LabelText, CaptionText } from '@shared/ui';
import { DropdownOption, DropdownResult, Position, Theme } from '../common/types';
import { CommonInputStyles, CommonInputStylesTheme } from '@shared/ui/Inputs/common/styles';
import {
  OptionsContainerStyle,
  OptionsContainerStyleTheme,
  OptionStyle,
  OptionStyleTheme,
  SelectButtonStyle,
  ViewClass,
} from '../common/constants';

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

const MultiSelect = ({
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
        <CaptionText as="span" className="px-1.5 leading-4 h-4 rounded-[30px] bg-icon-accent text-white" align="center">
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
              CommonInputStyles,
              CommonInputStylesTheme[theme],
              'w-full inline-flex items-center gap-x-2 justify-between pr-2 py-2',
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
                    <Checkbox
                      readOnly
                      checked={selected}
                      className={cnTw(
                        'w-full pointer-events-none',
                        selected ? 'text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      {element}
                    </Checkbox>
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

export default MultiSelect;
