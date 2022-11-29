import { Listbox, Transition } from '@headlessui/react';
import cn from 'classnames';
import { Fragment } from 'react';

import { Icon } from '@renderer/components/ui';
import { ViewClass, WeightClass } from './common/constants';
import { DropdownOption, Variant } from './common/types';

type Props = {
  className?: string;
  placeholder: string;
  value?: DropdownOption['value'];
  options: DropdownOption[];
  variant?: Variant;
  weight?: keyof typeof WeightClass;
  onChange: (data: DropdownOption) => void;
};

const Dropdown = ({ className, placeholder, value, options, variant = 'down', weight = 'md', onChange }: Props) => {
  const weightStyle = WeightClass[weight];

  return (
    <Listbox value={value} onChange={onChange}>
      {({ open }) => (
        <div className={cn('relative', className)}>
          <Listbox.Button
            className={cn(
              'group relative flex items-center gap-x-2.5 w-full rounded-2lg border bg-white px-2.5 transition',
              'hover:text-primary hover:border-primary focus:text-primary focus:border-primary',
              weightStyle.height,
              open && 'border-primary',
            )}
          >
            <div
              className={cn(
                'flex items-center gap-x-2.5 truncate text-left mr-auto',
                'group-hover:text-primary group-focus:text-primary transition',
                value && !open && 'text-neutral',
                !value && !open && 'text-shade-30',
                open && 'text-primary',
              )}
            >
              {value && (
                <>
                  {value.prefix}
                  {typeof value.element === 'string' ? (
                    <p className={cn(weightStyle.text)}>{value.element}</p>
                  ) : (
                    value.elment
                  )}
                </>
              )}
              {!value && <p className={cn(weightStyle.placeholder)}>{placeholder}</p>}
            </div>
            <span
              className={cn(
                'pointer-events-none pr-2.5 group-hover:text-primary group-focus:text-primary transition',
                open ? 'text-primary' : 'text-neutral-variant',
              )}
            >
              <Icon name="dropdown" size={weightStyle.arrows} />
            </span>
          </Listbox.Button>
          <Transition as={Fragment} leave="transition" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options
              className={cn(
                'absolute z-10 py-[15px] px-2.5 max-h-60 w-full overflow-auto shadow-element',
                'border border-primary rounded-2lg bg-white shadow-surface focus:outline-none',
                variant !== 'auto' && ViewClass[variant],
              )}
            >
              {options.map((option) => (
                <Listbox.Option
                  key={option.id}
                  value={option}
                  className={({ active }) =>
                    cn(
                      'flex items-center cursor-pointer select-none px-2.5 rounded-2lg',
                      active && 'bg-shade-5',
                      weightStyle.option,
                    )
                  }
                >
                  {({ selected }) => (
                    <div
                      className={cn(
                        'flex items-center gap-x-2.5 truncate text-sm',
                        selected ? 'text-primary' : 'text-neutral',
                        weightStyle.option,
                      )}
                    >
                      {option.prefix}
                      {typeof option.element === 'string' ? (
                        <p className={cn(weightStyle.text)}>{option.element}</p>
                      ) : (
                        option.element
                      )}
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
};

export default Dropdown;
