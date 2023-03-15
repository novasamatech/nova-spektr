import cn from 'classnames';
import { ChangeEvent, PropsWithChildren } from 'react';
import './styles.css';

type Props = {
  defaultChecked?: boolean;
  position?: 'right' | 'left';
  checked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  value?: any;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

const Checkbox = ({
  checked,
  defaultChecked,
  position = 'right',
  disabled,
  readOnly,
  value,
  className,
  children,
  onChange,
}: PropsWithChildren<Props>) => {
  const content = typeof children === 'string' ? <p className="text-gray-700 font-normal">{children}</p> : children;

  return (
    <label className={cn('flex items-center gap-x-2.5', !disabled && 'hover:cursor-pointer', className)}>
      {children && position === 'left' && content}
      <input
        type="checkbox"
        name="checkbox"
        defaultChecked={defaultChecked}
        disabled={disabled}
        readOnly={readOnly}
        checked={checked}
        value={value}
        className={cn(
          'relative appearance-none w-5 h-5 text-primary bg-white',
          'rounded-md border-shade-30 border-2 checked:bg-primary checked:border-0',
          disabled && 'opacity-50',
        )}
        onChange={onChange}
      />
      {children && position === 'right' && content}
    </label>
  );
};

export default Checkbox;
