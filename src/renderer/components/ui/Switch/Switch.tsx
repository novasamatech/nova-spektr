import { Switch as HeadlessSwitch } from '@headlessui/react';
import cn from 'classnames';
import { PropsWithChildren } from 'react';

interface Props {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (checked: boolean) => void;
}

const Switch = ({ checked, defaultChecked, disabled, className, onChange, children }: PropsWithChildren<Props>) => (
  <HeadlessSwitch.Group>
    <div className={cn('flex gap-x-2.5 items-center justify-between', className)}>
      {children && <HeadlessSwitch.Label className="cursor-pointer">{children}</HeadlessSwitch.Label>}
      <HeadlessSwitch
        disabled={disabled}
        checked={checked}
        defaultChecked={defaultChecked}
        className={cn(
          checked || defaultChecked ? 'bg-primary' : 'bg-shade-30',
          disabled && 'opacity-50',
          'relative inline-flex h-[22px] w-[38px] items-center rounded-full transform transition',
        )}
        onChange={onChange}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white transition shadow-element',
            checked || defaultChecked ? 'translate-x-[19px]' : 'translate-x-[3px]',
          )}
        />
      </HeadlessSwitch>
    </div>
  </HeadlessSwitch.Group>
);

export default Switch;
