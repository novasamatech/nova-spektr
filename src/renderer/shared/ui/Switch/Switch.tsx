import { Switch as HeadlessSwitch } from '@headlessui/react';
import { type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';
import { LabelText } from '../Typography';

type Props = {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
  knobClassName?: string;
  switchClassName?: string;
  labelPosition?: 'left' | 'right';
  onChange?: (checked: boolean) => void;
};

export const Switch = ({
  checked,
  defaultChecked,
  disabled,
  className,
  knobClassName,
  switchClassName,
  onChange,
  children,
  labelPosition = 'left',
}: PropsWithChildren<Props>) => {
  const label = (
    <HeadlessSwitch.Label as={LabelText} className="text-text-secondary cursor-pointer">
      {children}
    </HeadlessSwitch.Label>
  );

  return (
    <HeadlessSwitch.Group as="div" className={cnTw('flex gap-x-2.5 items-center justify-between', className)}>
      {children && labelPosition === 'left' && label}
      <HeadlessSwitch
        disabled={disabled}
        checked={checked}
        defaultChecked={defaultChecked}
        className={cnTw(
          checked || defaultChecked
            ? 'bg-switch-background-active border border-transparent'
            : 'bg-switch-background-inactive border border-container-border',
          disabled && 'opacity-50',
          'relative inline-flex w-7.5 items-center rounded-full transform transition p-[1px]',
          switchClassName,
        )}
        onChange={onChange}
      >
        <span
          className={cnTw(
            'inline-block h-3.5 w-3.5 rounded-full bg-knob-background transition shadow-knob-shadow',
            checked || defaultChecked ? 'translate-x-[12px]' : '',
            knobClassName,
          )}
        />
      </HeadlessSwitch>
      {children && labelPosition === 'right' && label}
    </HeadlessSwitch.Group>
  );
};
