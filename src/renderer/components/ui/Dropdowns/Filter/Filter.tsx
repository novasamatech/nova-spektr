import { Listbox, Transition } from '@headlessui/react';
import cn from 'classnames';
import { Fragment } from 'react';

import { Icon, Switch } from '@renderer/components/ui';
import { Option, ResultOption } from '../common/types';

type Props = {
  activeIds: Option['id'][];
  placeholder: string;
  className?: string;
  options: Option[];
  onChange: (data: ResultOption[]) => void;
};

const Filter = ({ activeIds, placeholder, options, className, onChange }: Props) => {
  const activeOptions = options.filter((option) => activeIds.includes(option.id));

  return (
    <Listbox multiple by="id" value={activeOptions} onChange={onChange}>
      {({ open }) => (
        <div className={cn('relative', className)}>
          <Listbox.Button
            className={cn(
              'group w-max px-2.5 h-10 rounded-2lg border transition',
              'hover:border-primary focus:border-primary',
              open && 'border-primary',
            )}
          >
            <div
              className={cn(
                'flex gap-x-2.5 items-center',
                'group-hover:text-primary group-focus:text-primary transition',
                open ? 'text-primary' : 'text-neutral',
              )}
            >
              <Icon name="sort" size={20} />
              {placeholder}
            </div>
          </Listbox.Button>
          <Transition as={Fragment} leave="transition" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options
              className={cn(
                'absolute z-10 top-full mt-1 py-[15px] px-2.5 max-h-60 w-full overflow-auto shadow-element',
                'border border-primary rounded-2lg bg-white shadow-surface focus:outline-none',
              )}
            >
              {options.map(({ id, value, element }) => (
                <Listbox.Option
                  key={id}
                  value={{ id, value }}
                  className={({ active }) =>
                    cn('h-10 flex items-center px-2.5 cursor-pointer rounded-2lg', active && 'bg-shade-10')
                  }
                >
                  {({ selected }) => (
                    <Switch className="w-full pointer-events-none" defaultChecked={selected}>
                      {element}
                    </Switch>
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

export default Filter;
