import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';
import { Fragment, type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { type RadioOption } from '../types';
import './RadioGroup.css';

type Props = {
  option: RadioOption<unknown>;
  disabled?: boolean;
};

export const Select = ({ option, disabled, children }: PropsWithChildren<Props>) => {
  const { id, value } = option;

  return (
    <HeadlessRadioGroup.Option value={{ id, value }} as={Fragment} disabled={disabled}>
      {({ checked }) => (
        <div
          className={cnTw(
            'flex w-full items-center justify-start gap-x-2 py-1.5',
            disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
          )}
        >
          <span
            className={cnTw(
              'relative h-4 w-4 rounded-full border border-filter-border bg-card-background',
              checked ? 'spektr-radio border-0 bg-primary-button-background-default' : 'border-filter-border',
            )}
          />
          {children}
        </div>
      )}
    </HeadlessRadioGroup.Option>
  );
};
