import { Combobox as HeadlessCombobox, Transition } from '@headlessui/react';
import { Fragment } from 'react';

import { cnTw } from '@shared/lib/utils';
import { Input, type Props as InputProps } from '../../Inputs/Input/Input';
import { FootnoteText } from '../../Typography';
import {
  OptionStyle,
  OptionStyleTheme,
  OptionsContainerStyle,
  OptionsContainerStyleTheme,
  ViewClass,
} from '../common/constants';
import { type ComboboxOption, type Position, type Theme } from '../common/types';

type Props = Omit<InputProps, 'onChange' | 'value'> & {
  query?: string;
  value?: ComboboxOption['value'];
  options: ComboboxOption[];
  position?: Position;
  tabIndex?: number;
  theme?: Theme;
  onInput: (value: string) => void;
  onChange: (data: ComboboxOption) => void;
};

export const Combobox = ({
  className,
  query = '',
  value,
  options,
  disabled,
  position = 'down',
  theme = 'light',
  onInput,
  onChange,
  ...inputProps
}: Props) => {
  const defaultValue = { id: '-1', value, element: value };
  const selectedOption = options.find((option) => option.value === value);

  const nothingFound = query.length > 0 && options.length === 0;

  return (
    <HeadlessCombobox value={selectedOption || defaultValue} disabled={disabled} onChange={onChange}>
      <div className={cnTw('relative', className)}>
        <HeadlessCombobox.Input
          as={Input}
          displayValue={(option: ComboboxOption) => option.value}
          // @ts-expect-error onChange doesn't respect custom <Input /> onChange type
          onChange={onInput}
          {...inputProps}
        />

        <Transition as={Fragment} leave="transition" leaveFrom="opacity-100" leaveTo="opacity-0">
          <HeadlessCombobox.Options
            className={cnTw(
              OptionsContainerStyle,
              OptionsContainerStyleTheme[theme],
              position !== 'auto' && ViewClass[position],
            )}
          >
            {nothingFound && (
              <HeadlessCombobox.Option
                value={{ id: '', value: query, element: query }}
                className={({ active }) => cnTw(OptionStyle, OptionStyleTheme[theme](active, false))}
              >
                <FootnoteText>{query}</FootnoteText>
              </HeadlessCombobox.Option>
            )}

            {options.map((option) => (
              <HeadlessCombobox.Option
                key={option.id}
                value={option}
                className={({ active, selected }) => cnTw(OptionStyle, OptionStyleTheme[theme](active, selected))}
                disabled={!!option.disabled}
              >
                {typeof option.element === 'string' ? <FootnoteText>{option.element}</FootnoteText> : option.element}
              </HeadlessCombobox.Option>
            ))}
          </HeadlessCombobox.Options>
        </Transition>
      </div>
    </HeadlessCombobox>
  );
};
