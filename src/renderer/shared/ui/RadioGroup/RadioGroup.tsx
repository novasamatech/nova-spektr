import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';
import { type PropsWithChildren } from 'react';

import { LabelText } from '@shared/ui';

import { RadioCard } from './RadioCard';
import { Option } from './RadioOption';
import { type RadioOption, type RadioResult } from './common/types';

import './RadioGroup.css';

type Props<T = any> = {
  name?: string;
  label?: string;
  activeId?: string;
  options: RadioOption<T>[];
  className?: string;
  onChange: (data: RadioResult<T>) => void;
};

const RadioGroupRoot = ({
  name,
  label,
  activeId,
  options,
  className,
  children,
  onChange,
}: PropsWithChildren<Props>) => {
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
    <div className="flex flex-col gap-y-2">
      <LabelText className="text-text-tertiary">{label}</LabelText>
      {radioElement}
    </div>
  );
};

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Option,
  CardOption: RadioCard,
});
