import { Listbox, Transition } from '@headlessui/react';
import cn from 'classnames';
import { Fragment, ReactNode } from 'react';

import { Icon } from '@renderer/components/ui';

// TODO: lg - 10px - x 14px - y
// TODO: md - 10px - x 12px - y
// currently uses ** md ** weight

export type OptionType = {
  prefix?: ReactNode;
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

const Dropdown = ({ className, placeholder, selected, options, onSelected }: Props) => (
  <Listbox value={selected} onChange={onSelected}>
    {({ open }) => (
      <div className={cn('relative', className)}>
        <Listbox.Button
          className={cn(
            'group relative w-full rounded-2lg border bg-white',
            'h-10 px-2.5 pr-10 text-left text-sm leading-4 font-semibold transition',
            'hover:text-primary hover:border-primary focus:text-primary focus:border-primary',
            open && 'border-primary',
          )}
        >
          <p
            className={cn(
              'flex items-center gap-x-2.5 truncate',
              'group-hover:text-primary group-hover:text-primary group-focus:text-primary transition',
              selected && !open && 'text-neutral',
              !selected && !open && 'text-shade-30',
              open && 'text-primary',
            )}
          >
            {selected ? (
              <>
                {selected.prefix}
                {selected.label}
              </>
            ) : (
              placeholder
            )}
          </p>
          <span
            className={cn(
              'flex items-center pointer-events-none absolute inset-y-0 right-0 pr-2.5',
              'group-hover:text-primary group-focus:text-primary transition',
              open ? 'text-primary' : 'text-neutral-variant',
            )}
          >
            <Icon as="svg" name="dropdown" size={20} />
          </span>
        </Listbox.Button>
        <Transition as={Fragment} leave="transition" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options
            className="absolute bottom-10.5 mb-2.5 py-2.5 max-h-60 w-full overflow-auto border
            border-primary rounded-2lg bg-white shadow-surface focus:outline-none"
          >
            {options.map((option, index) => (
              <Listbox.Option
                key={`${index}-${option.label}`}
                value={option}
                className={({ active }) =>
                  cn(
                    'relative cursor-pointer text-xs select-none px-2.5 border-b border-b-shade-5 last:border-0',
                    active && 'bg-shade-2',
                  )
                }
              >
                {({ selected }) => (
                  <div
                    className={cn(
                      'flex items-center gap-x-2.5 truncate text-sm leading-10',
                      selected ? 'text-primary' : 'text-neutral',
                    )}
                  >
                    {option.prefix}
                    {option.label}
                  </div>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    )}
  </Listbox>
);

export default Dropdown;
