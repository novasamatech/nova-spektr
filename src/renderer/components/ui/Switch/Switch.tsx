import { Switch as HeadlessSwitch } from '@headlessui/react';
import cn from 'classnames';
import noop from 'lodash/noop';

interface Props {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (checked: boolean) => void;
}

const Switch = ({ label, checked = false, disabled, className, onChange = noop }: Props) => {
  return (
    <HeadlessSwitch.Group>
      <div className="flex items-center">
        {label && <HeadlessSwitch.Label className="mr-4">{label}</HeadlessSwitch.Label>}
        <HeadlessSwitch
          disabled={disabled}
          checked={checked}
          onChange={onChange}
          className={cn(
            className,
            checked ? 'bg-primary' : 'bg-shade-30',
            disabled && 'opacity-50',
            'relative inline-flex h-[22px] w-[38px] items-center rounded-full transition-colors focus:outline-none',
          )}
        >
          <span
            className={cn(
              checked ? 'translate-x-[19px]' : 'translate-x-[3px]',
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            )}
          />
        </HeadlessSwitch>
      </div>
    </HeadlessSwitch.Group>
  );
};

export default Switch;
