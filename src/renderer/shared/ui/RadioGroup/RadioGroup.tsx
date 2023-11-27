import { PropsWithChildren } from 'react';
import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';

import Option from './RadioOption';
import { RadioOption, RadioResult } from './common/types';
import { LabelText } from '@shared/ui';
import './RadioGroup.css';

type Props = {
  name?: string;
  label?: string;
  activeId?: RadioOption['id'];
  options: RadioOption[];
  className?: string;
  onChange: (data: RadioResult) => void;
};

const RadioGroup = ({ name, label, activeId, options, className, children, onChange }: PropsWithChildren<Props>) => {
  const activeOption = options.find((option) => option.id === activeId);

  const radioElement = (
    <HeadlessRadioGroup by="id" className={className} name={name} value={activeOption} onChange={onChange}>
      {children}
    </HeadlessRadioGroup>
  );

  if (!label) {
    return radioElement;
  }

  return (
    <div className="flex flex-col gap-2">
      <LabelText className="text-text-tertiary">{label}</LabelText>
      {radioElement}
    </div>
  );
};

RadioGroup.Option = Option;

export default RadioGroup;
