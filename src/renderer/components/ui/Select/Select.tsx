import { Listbox, Transition } from '@headlessui/react';
import cn from 'classnames';
import { Fragment, ReactNode } from 'react';

import { Checkbox, Icon } from '@renderer/components/ui';
import { ViewClass, WeightClass } from './common/constants';
import { SelectOption, Variant } from './common/types';

type Props = {
  summary: ReactNode;
  className?: string;
  placeholder?: string;
  value: SelectOption['value'][];
  options: SelectOption[];
  variant?: Variant;
  suffix?: ReactNode;
  weight?: keyof typeof WeightClass;
  onChange: (data: SelectOption['value'][]) => void;
};

const Select = ({
  className,
  suffix,
  value = [],
  summary,
  placeholder,
  options,
  variant = 'down',
  weight = 'md',
  onChange,
}: Props) => {
  const weightStyle = WeightClass[weight];

  return (
    <Listbox multiple value={value} onChange={onChange}>
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
                'mr-auto group-hover:text-primary group-focus:text-primary transition',
                open && 'border-primary',
              )}
            >
              {value.length === 0 && (
                <p className={cn(weightStyle.placeholder, open ? 'text-primary' : 'text-shade-30')}>{placeholder}</p>
              )}
              {value.length > 0 && (
                <div className="flex gap-x-2.5 items-center">
                  <p
                    className={cn(
                      'flex items-center justify-center bg-neutral rounded-full text-white text-xs font-bold',
                      weightStyle.count,
                    )}
                  >
                    {value.length}
                  </p>
                  <p className={cn('text-neutral font-semibold', weightStyle.summary)}>{summary}</p>
                </div>
              )}
            </div>
            <span
              className={cn(
                'pointer-events-none',
                'group-hover:text-primary group-focus:text-primary transition',
                open ? 'text-primary' : 'text-neutral-variant',
              )}
            >
              <Icon name="dropdown" size={weightStyle.arrows} />
            </span>
            {suffix}
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
                  value={option.value}
                  className={({ active }) =>
                    cn(
                      'flex items-center cursor-pointer select-none px-2.5 rounded-2lg',
                      active && 'bg-shade-5',
                      weightStyle.option,
                    )
                  }
                >
                  {({ selected }) => (
                    <Checkbox readOnly checked={selected} position="left" className="w-full pointer-events-none">
                      <div className="w-full">{option.element}</div>
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
};

export default Select;
