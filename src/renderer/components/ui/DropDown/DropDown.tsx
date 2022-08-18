import cn from 'classnames';
import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';

import { Icon } from '@renderer/components/ui';

// TODO: lg - 10px - x 14px - y
// TODO: md - 10px - x 12px - y
// currently uses ** md ** weight

export type OptionType = {
  label: string;
  value: any;
};

type Props = {
  className?: string;
  placeholder: string;
  selected?: OptionType;
  options: OptionType[];
  onSelected: (data: OptionType) => void;
};

const DropDown = ({ className, placeholder, selected, options, onSelected }: Props) => (
  <Listbox value={selected} onChange={onSelected}>
    {({ open }) => (
      <div className={cn('relative w-full', className)}>
        <Listbox.Button
          className={cn(
            'group relative w-full rounded-2lg border bg-white py-3 px-2.5 pr-10 text-left text-sm leading-4 font-semibold hover:text-primary hover:border-primary focus:text-primary focus:border-primary transition',
            open && 'border-primary',
          )}
        >
          <p
            className={cn(
              'block truncate group-hover:text-primary group-hover:text-primary group-focus:text-primary transition',
              open && 'text-primary',
              !open && selected ? 'text-neutral' : 'text-shade-30',
            )}
          >
            {selected?.label || placeholder}
          </p>
          <span
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 group-hover:text-primary group-focus:text-primary transition',
              open ? 'text-primary' : 'text-neutral-variant',
            )}
          >
            <Icon as="svg" name="dropdown" size={20} />
          </span>
        </Listbox.Button>
        <Transition as={Fragment} leave="transition" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute bottom-10.5 mb-2.5 py-2.5 max-h-60 w-full overflow-auto border border-primary rounded-2lg bg-white shadow-surface focus:outline-none">
            {options.map((option, index) => (
              <Listbox.Option
                key={`${index}-${option.label}`}
                value={option}
                // TODO: need to think about keyboard navigation styles
                className={({ active }) =>
                  cn(
                    'relative cursor-pointer text-xs select-none px-2.5 border-b border-b-shade-5 last:border-0',
                    active && 'bg-shade-2',
                  )
                }
              >
                {({ selected }) => (
                  <span className={cn('block truncate text-sm leading-10', selected ? 'text-primary' : 'text-neutral')}>
                    {option.label}
                  </span>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    )}
  </Listbox>
);

export default DropDown;
