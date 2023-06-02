import { Fragment, PropsWithChildren } from 'react';
import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';

import cnTw from '@renderer/shared/utils/twMerge';
import { RadioOption, RadioResult } from './common/types';
import './RadioGroup.css';
import { SmallTitleText, LabelText } from '@renderer/components/ui-redesign';

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

type OptionProps = {
  option: RadioOption;
};

const Option = ({ option, children }: PropsWithChildren<OptionProps>) => {
  const { id, value, title } = option;

  return (
    <HeadlessRadioGroup.Option value={{ id, value }} as={Fragment}>
      {({ checked, disabled }) => (
        <div
          className={cnTw(
            'rounded border border-filter-border cursor-pointer mb-2 last:mb-0',
            checked && 'border-active-container-border',
          )}
        >
          <div
            className={cnTw(
              'flex justify-between items-center p-3 cursor-pointer hover:bg-hover focus:bg-hover',
              checked ? 'bg-hover' : 'bg-tab-background',
            )}
          >
            <SmallTitleText as="p" fontWeight="semibold" className={cnTw(checked && 'text-action-text')}>
              {title}
            </SmallTitleText>
            <span
              className={cnTw(
                'relative w-4 h-4 rounded-full border border-filter-border bg-card-background',
                checked ? 'spektr-radio border-0 bg-primary-button-background-default' : 'border-filter-border',
              )}
            />
          </div>
          {children && <div className="p-3">{children}</div>}
        </div>
      )}
    </HeadlessRadioGroup.Option>
  );
};

RadioGroup.Option = Option;

export default RadioGroup;
