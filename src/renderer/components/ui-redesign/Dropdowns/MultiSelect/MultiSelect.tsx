import { Listbox, Transition } from '@headlessui/react';
import cn from 'classnames';
import { Fragment, useId } from 'react';

import { Icon } from '@renderer/components/ui';
import { DropdownOption, DropdownResult, Position } from '../common/types';
import CommonInputStyles from '@renderer/components/ui-redesign/Inputs/common/styles';
import { CaptionText, Checkbox, FootnoteText, LabelText } from '@renderer/components/ui-redesign';
import { OptionsContainerStyle, OptionStyle, SelectButtonStyle, ViewClass } from '../common/constants';

type Props = {
  className?: string;
  placeholder: string;
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
  label,
  disabled,
  invalid,
  selectedIds = [],
  options,
  onChange,
  position = 'down',
  tabIndex,
}: Props) => {
  const selectedOptions = options.filter((option) => selectedIds?.includes(option.id));
  const id = useId();

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
        <FootnoteText as="span">{selectedOptions[0].element}</FootnoteText>
      ) : (
        selectedOptions[0].element
      );
    }

    return (
      <FootnoteText as="span" className="text-text-primary">
        {placeholder}
        <CaptionText as="span" className="text-button-text ml-2 py-0.5 px-1.5 rounded-[30px] bg-accent-background">
          {selectedOptions.length}
        </CaptionText>
      </FootnoteText>
    );
  };

  const selectElement = (
    <Listbox multiple by="id" disabled={disabled} value={selectedOptions} onChange={onChange}>
      {({ open }) => (
        <div className={cn('relative', className)}>
          <Listbox.Button
            id={id}
            className={cn(
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
            <Icon name="down" size={16} className="text-icon-default" />
          </Listbox.Button>

          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options className={cn(OptionsContainerStyle, position !== 'auto' && ViewClass[position])}>
              {options.map(({ id, value, element }) => (
                <Listbox.Option key={id} className={OptionStyle} value={{ id, value }}>
                  {({ selected }) => (
                    <Checkbox
                      readOnly
                      checked={selected}
                      className={cn(
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
    <div className="flex flex-col gap-2">
      <LabelText className="cursor-pointer" htmlFor={id}>
        {label}
      </LabelText>
      {selectElement}
    </div>
  );
};

export default MultiSelect;
