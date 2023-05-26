import { Fragment } from 'react';
import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';

import cnTw from '@renderer/shared/utils/twMerge';
import { RadioOption, RadioResult } from './common/types';
import './RadioGroup.css';

type Props = {
  name?: string;
  activeId?: RadioOption['id'];
  options: RadioOption[];
  optionClass?: string;
  className?: string;
  onChange: (data: RadioResult) => void;
};

const RadioGroup = ({ name, activeId, options, optionClass, className, onChange }: Props) => {
  const activeOption = options.find((option) => option.id === activeId);

  return (
    <HeadlessRadioGroup by="id" className={className} name={name} value={activeOption} onChange={onChange}>
      {options.map(({ id, value, element }) => (
        <HeadlessRadioGroup.Option key={id} value={{ id, value }} as={Fragment}>
          {({ checked, disabled }) => (
            <div className={cnTw('flex items-center gap-x-2.5 cursor-pointer', optionClass)}>
              <span
                className={cnTw(
                  'relative w-6 h-6 rounded-full border-2',
                  checked ? 'border-primary spektr-radio' : 'border-shade-30',
                  disabled && 'opacity-60',
                )}
              />
              {element}
            </div>
          )}
        </HeadlessRadioGroup.Option>
      ))}
    </HeadlessRadioGroup>
  );
};

export default RadioGroup;
