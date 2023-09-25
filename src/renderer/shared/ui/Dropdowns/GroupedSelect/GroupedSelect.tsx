import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useId } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { Icon, FootnoteText, LabelText, HelpText } from '@renderer/shared/ui';
import { DropdownOption, DropdownOptionGroup, DropdownResult, Position, Theme } from '../common/types';
import { CommonInputStyles, CommonInputStylesTheme } from '@renderer/shared/ui/Inputs/common/styles';
import {
  ButtonTextFilledStyle,
  ButtonTextEmptyStyle,
  OptionsContainerStyle,
  OptionsContainerStyleTheme,
  OptionStyle,
  OptionStyleTheme,
  SelectButtonStyle,
  ViewClass,
} from '../common/constants';

type Props<T> = {
  className?: string;
  placeholder: string;
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  selectedId?: DropdownOption['id'];
  optionsGroups: DropdownOptionGroup<T>[];
  position?: Position;
  theme?: Theme;
  onChange: (data: DropdownResult<T>) => void;
};

export const GroupedSelect = <T extends any>({
  className,
  placeholder,
  label,
  disabled,
  invalid,
  selectedId,
  optionsGroups,
  theme = 'light',
  onChange,
  position = 'down',
}: Props<T>) => {
  const id = useId();
  const options = optionsGroups.reduce<DropdownOption<T>[]>((acc, group) => {
    acc.push(...group.options);

    return acc;
  }, []);
  const selectedOption = options.find((option) => option.id === selectedId);

  const selectElement = (
    <Listbox disabled={disabled} value={selectedOption || {}} onChange={onChange}>
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
              'w-full flex items-center gap-x-2 justify-between pr-2',
            )}
          >
            {selectedOption ? (
              typeof selectedOption.element === 'string' ? (
                <FootnoteText
                  as="span"
                  className={cnTw('truncate', ButtonTextFilledStyle[theme], disabled && 'text-text-tertiary')}
                >
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

          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options
              as="dl"
              className={cnTw(
                'gap-y-1',
                OptionsContainerStyle,
                OptionsContainerStyleTheme[theme],
                position !== 'auto' && ViewClass[position],
              )}
            >
              {optionsGroups.map(({ id, label, options }, index) => (
                <Fragment key={id}>
                  <HelpText className="px-2 py-1 text-text-secondary cursor-default" as="dt">
                    {label}
                  </HelpText>
                  {options.map(({ id, value, element }) => (
                    <Listbox.Option
                      key={id}
                      value={{ id, value }}
                      as="dd"
                      className={({ active, selected }) =>
                        cnTw(OptionStyle, OptionStyleTheme[theme](active, selectedId === id))
                      }
                    >
                      {['string', 'number'].includes(typeof element) ? (
                        <FootnoteText className="text-text-secondary">{element}</FootnoteText>
                      ) : (
                        element
                      )}
                    </Listbox.Option>
                  ))}
                </Fragment>
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
