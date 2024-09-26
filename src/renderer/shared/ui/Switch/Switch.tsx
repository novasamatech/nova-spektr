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
    <HeadlessSwitch.Label as={LabelText} className="cursor-pointer text-text-secondary">
      {children}
    </HeadlessSwitch.Label>
  );

  return (
    <HeadlessSwitch.Group as="div" className={cnTw('flex items-center justify-between gap-x-2.5', className)}>
      {children && labelPosition === 'left' && label}
      <HeadlessSwitch
        disabled={disabled}
        checked={checked}
        defaultChecked={defaultChecked}
        className={cnTw(
          checked || defaultChecked
            ? 'border border-transparent bg-switch-background-active'
            : 'border border-container-border bg-switch-background-inactive',
          disabled && 'opacity-50',
          'relative inline-flex w-7.5 transform items-center rounded-full p-[1px] transition',
          switchClassName,
        )}
        onChange={onChange}
      >
        <span
          className={cnTw(
            'inline-block h-3.5 w-3.5 rounded-full bg-knob-background shadow-knob-shadow transition',
            checked || defaultChecked ? 'translate-x-[12px]' : '',
            knobClassName,
          )}
        />
      </HeadlessSwitch>
      {children && labelPosition === 'right' && label}
    </HeadlessSwitch.Group>
  );
};
