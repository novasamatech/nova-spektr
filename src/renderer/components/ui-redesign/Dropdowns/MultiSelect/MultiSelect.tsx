import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useId } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { Icon } from '@renderer/components/ui';
import { DropdownOption, DropdownResult, Position } from '../common/types';
import CommonInputStyles from '@renderer/components/ui-redesign/Inputs/common/styles';
import { Checkbox, FootnoteText, LabelText, HeadlineText } from '@renderer/components/ui-redesign';
import { OptionsContainerStyle, OptionStyle, SelectButtonStyle, ViewClass } from '../common/constants';

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
      <span className="relative flex items-center">
        <HeadlineText
          as="span"
          className="absolute w-6 h-6 border border-token-container-border rounded"
          align="center"
        >
          {selectedOptions.length}
        </HeadlineText>
        <FootnoteText as="span" className="ml-7 py-[1px]">
          {multiPlaceholder || placeholder}
        </FootnoteText>
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
              open && SelectButtonStyle.open,
              !open && !invalid && SelectButtonStyle.closed,
              invalid && SelectButtonStyle.invalid,
              SelectButtonStyle.disabled,
              CommonInputStyles,
              'w-full inline-flex items-center gap-x-2 justify-between pr-2',
            )}
            tabIndex={tabIndex}
          >
            {getSelectButtonElement()}
            <Icon name={open ? 'up' : 'down'} size={16} />
          </Listbox.Button>

          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options className={cnTw(OptionsContainerStyle, position !== 'auto' && ViewClass[position])}>
              {options.map(({ id, value, element }) => (
                <Listbox.Option
                  key={id}
                  value={{ id, value }}
                  className={({ active }) => cnTw(OptionStyle, active && 'bg-action-background-hover')}
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
