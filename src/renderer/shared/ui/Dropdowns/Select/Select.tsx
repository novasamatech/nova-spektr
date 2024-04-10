import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useId, forwardRef } from 'react';

import { cnTw } from '@shared/lib/utils';
import { Icon } from '../../Icon/Icon';
import { FootnoteText, LabelText } from '../../Typography';
import { DropdownOption, DropdownResult, Position, Theme } from '../common/types';
import { CommonInputStyles, CommonInputStylesTheme } from '../../Inputs/common/styles';
import {
  ButtonTextFilledStyle,
  ButtonTextEmptyStyle,
  OptionsContainerStyle,
  OptionsContainerStyleTheme,
  OptionStyle,
  OptionStyleTheme,
  OptionTextStyle,
  SelectButtonStyle,
  ViewClass,
} from '../common/constants';

type Props<T extends any = any> = {
  className?: string;
  placeholder: string;
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  selectedId?: string;
  options: DropdownOption<T>[];
  position?: Position;
  tabIndex?: number;
  theme?: Theme;
  onChange: (data: DropdownResult<T>) => void;
};

export const Select = forwardRef<HTMLButtonElement, Props>(
  (
    {
      className,
      placeholder,
      label,
      disabled,
      invalid,
      selectedId,
      options,
      position = 'down',
      tabIndex,
      theme = 'light',
      onChange,
    },
    ref,
  ) => {
    const id = useId();
    const selectedOption = options.find((option) => option.id === selectedId);

    const selectElement = (
      <Listbox disabled={disabled} value={selectedOption || {}} onChange={onChange}>
        {({ open }) => (
          <div className={cnTw('relative', className)}>
            <Listbox.Button
              ref={ref}
              id={id}
              tabIndex={tabIndex}
              className={cnTw(
                open && SelectButtonStyle[theme].open,
                !open && !invalid && SelectButtonStyle[theme].closed,
                invalid && SelectButtonStyle[theme].invalid,
                SelectButtonStyle[theme].disabled,
                CommonInputStyles,
                CommonInputStylesTheme[theme],
                'w-full flex items-center gap-x-2 justify-between pr-2',
              )}
            >
              {selectedOption && !open ? (
                typeof selectedOption.element === 'string' ? (
                  <FootnoteText as="span" className={cnTw('truncate', ButtonTextFilledStyle[theme])}>
                    {selectedOption.element}
                  </FootnoteText>
                ) : (
                  selectedOption.element
                )
              ) : (
                <FootnoteText as="span" className={ButtonTextEmptyStyle[theme]}>
                  {placeholder}
                </FootnoteText>
              )}
              <Icon name={open ? 'up' : 'down'} size={16} />
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options
                className={cnTw(
                  OptionsContainerStyle,
                  OptionsContainerStyleTheme[theme],
                  position !== 'auto' && ViewClass[position],
                )}
              >
                {options.map(({ id, value, element, disabled }) => (
                  <Listbox.Option
                    key={id}
                    value={{ id, value }}
                    disabled={disabled}
                    className={({ active }) =>
                      cnTw(
                        OptionStyle,
                        disabled ? 'cursor-default' : OptionStyleTheme[theme](active, id === selectedId),
                      )
                    }
                  >
                    {['string', 'number'].includes(typeof element) ? (
                      <FootnoteText className={OptionTextStyle[theme]}>{element}</FootnoteText>
                    ) : (
                      element
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    );

    if (!label) return selectElement;

    return (
      <div className="flex flex-col gap-y-2">
        <LabelText className="cursor-pointer text-text-tertiary font-medium" htmlFor={id}>
          {label}
        </LabelText>
        {selectElement}
      </div>
    );
  },
);
