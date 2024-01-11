import { Fragment, useState } from 'react';
import { Transition, Combobox as HeadlessCombobox } from '@headlessui/react';

import { cnTw, includes } from '@shared/lib/utils';
import { Props as InputProps } from '@shared/ui/Inputs/Input/Input';
import { Position, ComboboxOption, Theme } from '../common/types';
import { FootnoteText, Input } from '@shared/ui';
import {
  OptionsContainerStyle,
  OptionsContainerStyleTheme,
  OptionStyle,
  OptionStyleTheme,
  ViewClass,
} from '../common/constants';

type Props = Omit<InputProps, 'onChange' | 'value'> & {
  options: ComboboxOption[];
  value?: ComboboxOption;
  position?: Position;
  onChange: (data: ComboboxOption) => void;
  tabIndex?: number;
  theme?: Theme;
};

export const Combobox = ({
  className,
  value,
  options,
  disabled,
  position = 'down',
  theme = 'light',
  onChange,
  ...inputProps
}: Props) => {
  const [query, setQuery] = useState('');

  const filteredOptions = query
    ? options.filter((option) => includes(option.value, query) || includes(JSON.stringify(option.element), query))
    : options;

  const nothingFound = query.length > 0 && !filteredOptions.length;

  return (
    <HeadlessCombobox by="value" value={value} disabled={disabled} onChange={onChange}>
      <div className={cnTw('relative', className)}>
        <HeadlessCombobox.Input
          as={Input}
          displayValue={(option: ComboboxOption) => option.value}
          // @ts-ignore onChange doesn't respect custom <Input /> onChange type
          onChange={setQuery}
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

            {filteredOptions.map((option) => (
              <HeadlessCombobox.Option
                key={option.id}
                value={option}
                className={({ active, selected }) => cnTw(OptionStyle, OptionStyleTheme[theme](active, selected))}
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
