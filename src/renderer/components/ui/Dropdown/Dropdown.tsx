import { Listbox, Transition } from '@headlessui/react';
import cn from 'classnames';
import { Fragment } from 'react';

import { Icon } from '@renderer/components/ui';
import { ViewClass } from './common/constants';
import { DropdownOption, Variant } from './common/types';

// TODO: lg - 10px - x 14px - y
// TODO: md - 10px - x 12px - y
// currently uses ** md ** weight

type Props = {
  className?: string;
  placeholder: string;
  selected?: DropdownOption;
  options: DropdownOption[];
  variant?: Variant;
  height?: number;
  onSelected: (data: DropdownOption) => void;
};

const Dropdown = ({ className, placeholder, selected, options, variant = 'down', height, onSelected }: Props) => (
  <Listbox value={selected} onChange={onSelected}>
    {({ open }) => (
      <div className={cn('relative', className)}>
        <Listbox.Button
          className={cn(
            'group relative w-full rounded-2lg border bg-white',
            'px-2.5 text-left text-sm font-semibold transition',
            'hover:text-primary hover:border-primary focus:text-primary focus:border-primary',
            open && 'border-primary',
            height ? `h-${height}` : 'h-10',
          )}
        >
          <div
            className={cn(
              'flex items-center gap-x-2.5 truncate',
              'group-hover:text-primary group-focus:text-primary transition',
              selected && !open && 'text-neutral',
              !selected && !open && 'text-shade-30',
              open && 'text-primary',
            )}
          >
            {selected ? (
              <>
                {selected.prefix}
                {selected.element}
              </>
            ) : (
              placeholder
            )}
          </div>
          <span
            className={cn(
              'flex items-center pointer-events-none absolute inset-y-0 right-0 pr-2.5',
              'group-hover:text-primary group-focus:text-primary transition',
              open ? 'text-primary' : 'text-neutral-variant',
            )}
          >
            <Icon name="dropdown" size={20} />
          </span>
        </Listbox.Button>
        <Transition as={Fragment} leave="transition" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options
            className={cn(
              'absolute z-10 top-full mt-2.5 py-2.5 max-h-60 w-full overflow-auto shadow-element',
              'border border-primary rounded-2lg bg-white shadow-surface focus:outline-none',
              variant !== 'auto' && ViewClass[variant],
            )}
          >
            {options.map((option, index) => (
              <Listbox.Option
                key={`${index}-${option.element}`}
                value={option}
                className={({ active }) =>
                  cn(
                    'cursor-pointer text-xs select-none px-2.5 border-b border-b-shade-5 last:border-0',
                    active && 'bg-shade-2',
                  )
                }
              >
                {({ selected }) => (
                  <div
                    className={cn(
                      'flex items-center gap-x-2.5 truncate text-sm',
                      selected ? 'text-primary' : 'text-neutral',
                      height ? `h-${height}` : 'h-10',
                    )}
                  >
                    {option.prefix}
                    {option.element}
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
