import { Listbox, Transition } from '@headlessui/react';
import cn from 'classnames';
import { Fragment, ReactNode } from 'react';

import { Icon } from '@renderer/components/ui';
import { ViewClass, DropdownClass } from '../common/constants';
import { DropdownOption, DropdownResult, Variant } from '../common/types';

type Props = {
  className?: string;
  placeholder: string;
  label?: string;
  disabled?: boolean;
  activeId?: DropdownOption['id'];
  options: DropdownOption[];
  suffix?: ReactNode;
  variant?: Variant;
  weight?: keyof typeof DropdownClass;
  onChange: (data: DropdownResult) => void;
};

const Dropdown = ({
  className,
  placeholder,
  label,
  disabled,
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
    <Listbox by="id" value={activeOption || {}} disabled={disabled} onChange={onChange}>
      {({ open, disabled }) => (
        <div className={cn('relative', className)}>
          <Listbox.Button
            className={cn(
              'group w-full rounded-2lg border px-2.5 ',
              !disabled && 'hover:border-primary focus:border-primary transition',
              open && 'border-primary',
              label ? `flex flex-col bg-shade-2 border-shade-2 ${style.label.height}` : `bg-white ${style.height}`,
            )}
          >
            {label && (
              <p className={cn('pt-2.5 pb-1 text-left text-neutral-variant font-bold uppercase', style.label.text)}>
                {label}
              </p>
            )}

            <div className="flex items-center gap-x-2.5 w-full">
              {activeOption &&
                (typeof activeOption.element === 'string' ? (
                  <p
                    className={cn(
                      !disabled && 'group-hover:text-primary group-focus:text-primary transition',
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
                    !disabled && 'group-hover:text-primary group-focus:text-primary transition',
                    open ? 'text-primary' : 'text-shade-30',
                    style.placeholder,
                  )}
                >
                  {placeholder}
                </p>
              )}
              <span
                className={cn(
                  'ml-auto pointer-events-none',
                  !disabled && 'group-hover:text-primary group-focus:text-primary transition',
                  open ? 'text-primary' : 'text-neutral-variant',
                )}
              >
                <Icon name="down" size={style.arrows} />
              </span>
              {suffix}
            </div>
          </Listbox.Button>
          <Transition as={Fragment} leave="transition" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options
              className={cn(
                'absolute z-20 py-2.5 px-2 max-h-60 w-full overflow-auto shadow-element',
                'border border-primary rounded-2lg bg-white shadow-surface',
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
