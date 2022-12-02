import { RadioGroup as RadioSet } from '@headlessui/react';
import cn from 'classnames';
import { Fragment } from 'react';

import { RadioOption, ResultOption } from './common/types';
import './RadioGroup.css';

type Props = {
  name?: string;
  activeId?: RadioOption['id'];
  options: RadioOption[];
  optionClass?: string;
  className?: string;
  onChange: (data: ResultOption) => void;
};

const RadioGroup = ({ name, activeId, options, optionClass, className, onChange }: Props) => {
  const activeOption = options.find((option) => option.id === activeId);

  return (
    <RadioSet by="id" className={className} name={name} value={activeOption} onChange={onChange}>
      {options.map(({ id, value, element }) => (
        <RadioSet.Option key={id} value={{ id, value }} as={Fragment}>
          {({ checked, disabled }) => (
            <div className={cn('flex items-center gap-x-2.5 cursor-pointer', optionClass)}>
              <span
                className={cn(
                  'relative w-6 h-6 rounded-full border-2',
                  checked ? 'border-primary radio' : 'border-shade-30',
                  disabled && 'opacity-60',
                )}
              />
              {element}
            </div>
          )}
        </RadioSet.Option>
      ))}
    </RadioSet>
  );
};

export default RadioGroup;
