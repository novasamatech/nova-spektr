import { ComponentPropsWithoutRef, Fragment, ReactNode, useState } from 'react';
import { Transition, Combobox as HeadlessCombobox } from '@headlessui/react';
import cn from 'classnames';

import { Input } from '@renderer/components/ui';
import { ViewClass, DropdownClass } from '../common/constants';
import { DropdownOption, DropdownResult, HTMLComboboxProps, Variant } from '../common/types';
import { includes } from '@renderer/shared/utils/strings';

interface Props extends Pick<ComponentPropsWithoutRef<'input'>, HTMLComboboxProps> {
  label?: ReactNode;
  invalid?: boolean;
  options: DropdownOption[];
  value?: DropdownOption['value'];
  filterBy?: string;
  suffixElement?: ReactNode;
  prefixElement?: ReactNode;
  variant?: Variant;
  weight?: keyof typeof DropdownClass;
  onChange: (data: DropdownResult) => void;
}

const Combobox = ({
  className,
  placeholder,
  label,
  value,
  options,
  disabled,
  suffixElement,
  prefixElement,
  variant = 'down',
  weight = 'md',
  invalid,
  onChange,
  ...props
}: Props) => {
  const style = DropdownClass[weight];

  const [query, setQuery] = useState('');

  const filteredOptions = query
    ? options.filter((option) => includes(option.value, query) || includes(JSON.stringify(option.element), query))
    : options;

  return (
    <HeadlessCombobox by="value" value={value} disabled={disabled} onChange={onChange}>
      <div className={cn('relative', className)}>
        <HeadlessCombobox.Input
          as={Input}
          placeholder={placeholder}
          label={label}
          invalid={invalid}
          // @ts-ignore
          displayValue={(option) => option.value}
          prefixElement={prefixElement}
          suffixElement={suffixElement}
          // @ts-ignore onChange doesn't respect custom <Input /> onChange type
          onChange={setQuery}
          {...props}
        />

        <Transition as={Fragment} leave="transition" leaveFrom="opacity-100" leaveTo="opacity-0">
          <HeadlessCombobox.Options
            className={cn(
              'absolute z-20 py-2.5 px-2 max-h-60 w-full overflow-auto shadow-element',
              'border border-primary rounded-2lg bg-white shadow-surface focus:outline-none',
              variant !== 'auto' && ViewClass[variant],
            )}
          >
            {query.length > 0 && (
              <HeadlessCombobox.Option
                value={{ id: '', value: query, element: query }}
                className={({ active }) =>
                  cn(
                    'flex items-center cursor-pointer select-none px-2.5 rounded-2lg mb-[2px] last:mb-0',
                    active && 'bg-shade-5',
                    style.option,
                  )
                }
              >
                <div className={cn('flex items-center gap-x-2.5 truncate text-sm', style.option)}>
                  <p className={cn('text-neutral', style.text)}>{query}</p>
                </div>
              </HeadlessCombobox.Option>
            )}

            {filteredOptions.map((option) => (
              <HeadlessCombobox.Option
                key={option.id}
                value={option}
                className={({ active }) =>
                  cn(
                    'flex items-center cursor-pointer select-none px-2.5 rounded-2lg mb-[2px] last:mb-0',
                    active && 'bg-shade-5',
                    style.option,
                  )
                }
              >
                <div className={cn('flex items-center gap-x-2.5 truncate text-sm', style.option)}>
                  {typeof option.element === 'string' ? (
                    <p className={cn('text-neutral', style.text)}>{option.element}</p>
                  ) : (
                    option.element
                  )}
                </div>
              </HeadlessCombobox.Option>
            ))}
          </HeadlessCombobox.Options>
        </Transition>
      </div>
    </HeadlessCombobox>
  );
};

export default Combobox;
