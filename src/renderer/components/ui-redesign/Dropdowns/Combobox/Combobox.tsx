import { Fragment, useState } from 'react';
import { Transition, Combobox as HeadlessCombobox } from '@headlessui/react';

import cnTw from '@renderer/shared/utils/twMerge';
import { Props as InputProps } from '@renderer/components/ui-redesign/Inputs/Input/Input';
import { OptionsContainerStyle, OptionStyle, ViewClass } from '../common/constants';
import { DropdownOption, DropdownResult, Position } from '../common/types';
import { includes } from '@renderer/shared/utils/strings';
import { FootnoteText, Input } from '@renderer/components/ui-redesign';

type ComboboxOption = Required<DropdownOption>;

type Props = Omit<InputProps, 'onChange'> & {
  options: ComboboxOption[];
  value?: ComboboxOption['value'];
  position?: Position;
  onChange: (data: DropdownResult) => void;
  tabIndex?: number;
};

const Combobox = ({ className, value, options, disabled, position = 'down', onChange, ...inputProps }: Props) => {
  const [query, setQuery] = useState('');

  const filteredOptions = query
    ? options.filter((option) => includes(option.value, query) || includes(JSON.stringify(option.element), query))
    : options;

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
          <HeadlessCombobox.Options className={cnTw(OptionsContainerStyle, position !== 'auto' && ViewClass[position])}>
            {query.length > 0 && (
              <HeadlessCombobox.Option value={{ id: '', value: query, element: query }} className={OptionStyle}>
                <FootnoteText>{query}</FootnoteText>
              </HeadlessCombobox.Option>
            )}

            {filteredOptions.map((option) => (
              <HeadlessCombobox.Option key={option.id} value={option} className={OptionStyle}>
                {typeof option.element === 'string' ? <FootnoteText>{option.element}</FootnoteText> : option.element}
              </HeadlessCombobox.Option>
            ))}
          </HeadlessCombobox.Options>
        </Transition>
      </div>
    </HeadlessCombobox>
  );
};

export default Combobox;
