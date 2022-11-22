import cn from 'classnames';
import { PropsWithChildren } from 'react';
import './styles.css';

type Props = {
  checked?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: () => void;
};

const Checkbox = ({ checked, disabled, className, children, onChange }: PropsWithChildren<Props>) => (
  <label className={cn('flex items-center', !disabled && 'hover:cursor-pointer', className)}>
    <input
      type="checkbox"
      name="checkbox"
      disabled={disabled}
      checked={checked}
      onChange={onChange}
      className={cn(
        'relative',
        'appearance-none w-5 h-5 text-primary bg-white ',
        'rounded-md border-shade-30 border-2',
        'checked:bg-primary checked:border-0',
        disabled && 'opacity-50',
      )}
    />
    {children &&
      (typeof children === 'string' ? <span className="ml-2 text-gray-700 font-normal">{children}</span> : children)}
  </label>
);

export default Checkbox;
