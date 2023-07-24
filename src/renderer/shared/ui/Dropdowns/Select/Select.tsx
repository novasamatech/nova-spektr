import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useId } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { Icon, FootnoteText, LabelText } from '@renderer/shared/ui';
import { DropdownOption, DropdownResult, Position } from '../common/types';
import CommonInputStyles from '@renderer/shared/ui/Inputs/common/styles';
import { OptionsContainerStyle, OptionStyle, SelectButtonStyle, ViewClass } from '../common/constants';

type Props<T> = {
  className?: string;
  placeholder: string;
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  selectedId?: DropdownOption['id'];
  options: DropdownOption<T>[];
  position?: Position;
  tabIndex?: number;
  onChange: (data: DropdownResult<T>) => void;
};

const Select = <T extends any>({
  className,
  placeholder,
  label,
  disabled,
  invalid,
  selectedId,
  options,
  onChange,
  position = 'down',
  tabIndex,
}: Props<T>) => {
  const id = useId();
  const selectedOption = options.find((option) => option.id === selectedId);

  const selectElement = (
    <Listbox disabled={disabled} value={selectedOption || {}} onChange={onChange}>
      {({ open }) => (
        <div className={cnTw('relative', className)}>
          <Listbox.Button
            id={id}
            tabIndex={tabIndex}
            className={cnTw(
              open && SelectButtonStyle.open,
              !open && !invalid && SelectButtonStyle.closed,
              invalid && SelectButtonStyle.invalid,
              SelectButtonStyle.disabled,
              CommonInputStyles,
              'w-full flex items-center gap-x-2 justify-between pr-2',
            )}
          >
            {selectedOption ? (
              typeof selectedOption.element === 'string' ? (
                <FootnoteText as="span" className="truncate">
                  {selectedOption.element}
                </FootnoteText>
              ) : (
                selectedOption.element
              )
            ) : (
              <FootnoteText as="span" className="text-text-secondary">
                {placeholder}
              </FootnoteText>
            )}
            <Icon name={open ? 'up' : 'down'} size={16} />
          </Listbox.Button>

          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options className={cnTw(OptionsContainerStyle, position !== 'auto' && ViewClass[position])}>
              {options.map(({ id, value, element }) => (
                <Listbox.Option
                  key={id}
                  value={{ id, value }}
                  className={({ active, selected }) =>
                    cnTw(OptionStyle, active && 'bg-action-background-hover', selected && 'bg-selected-background')
                  }
                >
                  {['string', 'number'].includes(typeof element) ? <FootnoteText>{element}</FootnoteText> : element}
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
    <div className="flex flex-col gap-2">
      <LabelText className="cursor-pointer text-text-tertiary font-medium" htmlFor={id}>
        {label}
      </LabelText>
      {selectElement}
    </div>
  );
};

export default Select;
