import { Switch as HeadlessSwitch } from '@headlessui/react';
import cn from 'classnames';
import { PropsWithChildren } from 'react';

import { LabelText } from '@renderer/components/ui-redesign';

interface Props {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
  labelPosition?: 'left' | 'right';
  onChange?: (checked: boolean) => void;
}

const Switch = ({
  checked,
  defaultChecked,
  disabled,
  className,
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
    <HeadlessSwitch.Group as="div" className={cn('flex gap-x-2.5 items-center justify-between', className)}>
      {children && labelPosition === 'left' && label}
      <HeadlessSwitch
        disabled={disabled}
        checked={checked}
        defaultChecked={defaultChecked}
        className={cn(
          checked || defaultChecked
            ? 'bg-switch-background-active'
            : 'bg-switch-background-inactive border border-container-border',
          disabled && 'opacity-50',
          'relative inline-flex h-[16px] w-[28px] items-center rounded-full transform transition',
        )}
        onChange={onChange}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-knob-background transition shadow-knob-shadow',
            checked || defaultChecked ? 'translate-x-[13px]' : 'translate-x-[1px]',
          )}
        />
      </HeadlessSwitch>
      {children && labelPosition === 'right' && label}
    </HeadlessSwitch.Group>
  );
};

export default Switch;
