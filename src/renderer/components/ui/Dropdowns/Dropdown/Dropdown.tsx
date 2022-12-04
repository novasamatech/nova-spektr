import { Listbox, Transition } from '@headlessui/react';
import cn from 'classnames';
import { Fragment, ReactNode } from 'react';

import { Icon } from '@renderer/components/ui';
import { ViewClass, DropdownClass } from '../common/constants';
import { Option, ResultOption, Variant } from '../common/types';

type Props = {
  className?: string;
  placeholder: string;
  label?: string;
  activeId?: Option['id'];
  options: Option[];
  suffix?: ReactNode;
  variant?: Variant;
  weight?: keyof typeof DropdownClass;
  onChange: (data: ResultOption) => void;
};

const Dropdown = ({
  className,
  placeholder,
  label,
  activeId,
  options,
  suffix,
  variant = 'down',
  weight = 'md',
  onChange,
}: Props) => {
  const style = DropdownClass[weight];

  const activeOption = options.find((option) => option.id === activeId);

  return (
    <Listbox by="id" value={activeOption} onChange={onChange}>
      {({ open }) => (
        <div className={cn('relative', className)}>
          <Listbox.Button
            className={cn(
              'group w-full rounded-2lg border px-2.5 transition hover:border-primary focus:border-primary',
              open && 'border-primary',
              label ? `flex flex-col bg-shade-2 border-shade-2 ${style.label.height}` : `bg-white ${style.height}`,
            )}
          >
            {label && (
              <p className={cn('pt-2.5 pb-1 text-left text-neutral-variant font-bold uppercase', style.label.text)}>
                {label}
              </p>
            )}

            <div className={cn('flex items-center gap-x-2.5 w-full', style.label.content)}>
              {activeOption &&
                (typeof activeOption.element === 'string' ? (
                  <p
                    className={cn(
                      'group-hover:text-primary group-focus:text-primary transition',
                      open ? 'text-primary' : 'text-neutral',
                      style.text,
                    )}
                  >
                    {activeOption.element}
                  </p>
                ) : (
                  activeOption.element
                ))}

              {!activeOption && (
                <p
                  className={cn(
                    'group-hover:text-primary group-focus:text-primary transition',
                    open ? 'text-primary' : 'text-shade-30',
                    style.placeholder,
                  )}
                >
                  {placeholder}
                </p>
              )}
              <span
                className={cn(
                  'ml-auto pointer-events-none group-hover:text-primary group-focus:text-primary transition',
                  open ? 'text-primary' : 'text-neutral-variant',
                )}
              >
                <Icon name="dropdown" size={style.arrows} />
              </span>
              {suffix}
            </div>
          </Listbox.Button>
          <Transition as={Fragment} leave="transition" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options
              className={cn(
                'absolute z-10 py-2.5 px-2 max-h-60 w-full overflow-auto overscroll-contain shadow-element',
                'border border-primary rounded-2lg bg-white shadow-surface focus:outline-none',
                variant !== 'auto' && ViewClass[variant],
              )}
            >
              {options.map(({ id, value, element }) => (
                <Listbox.Option
                  key={id}
                  value={{ id, value }}
                  className={({ active, selected }) =>
                    cn(
                      'flex items-center cursor-pointer select-none px-2.5 rounded-2lg mb-[2px] last:mb-0',
                      (active || selected) && 'bg-shade-5',
                      style.option,
                    )
                  }
                >
                  <div className={cn('flex items-center gap-x-2.5 truncate text-sm', style.option)}>
                    {typeof element === 'string' ? (
                      <p className={cn('text-neutral', style.text)}>{element}</p>
                    ) : (
                      element
                    )}
                  </div>
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
