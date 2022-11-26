import { RadioGroup } from '@headlessui/react';
import cn from 'classnames';
import { Fragment } from 'react';

import { RadioOption } from './common/types';
import './Radio.css';

type Props = {
  name?: string;
  selected?: RadioOption['value'];
  options: RadioOption[];
  optionClass?: string;
  className?: string;
  onChange: (data: RadioOption) => void;
};

const Radio = ({ name, selected, options, optionClass, className, onChange }: Props) => (
  <RadioGroup className={className} name={name} value={selected} onChange={onChange}>
    {options.map(({ id, value, element }) => (
      <RadioGroup.Option key={id} value={value} as={Fragment}>
        {({ active, checked, disabled }) => (
          <li className={cn('grid grid-cols-max-full items-center gap-x-2.5 cursor-pointer', optionClass)}>
            <span
              className={cn(
                'relative w-6 h-6 rounded-full border-2',
                active ? 'border-primary radio' : 'border-shade-30',
                disabled && 'opacity-60',
              )}
            />
            {element}
          </li>
        )}
      </RadioGroup.Option>
    ))}
  </RadioGroup>
);

export default Radio;
