import { InputHTMLAttributes } from 'react';
import cn from 'classnames';
import './styles.css';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = ({ label, checked, disabled, className, onChange }: Props) => (
  <div className={cn(disabled && 'hover:cursor-pointer', className)}>
    <label className="flex items-center">
      <input
        type="checkbox"
        name="checkbox"
        disabled={disabled}
        checked={checked}
        className={cn(
          'relative',
          'appearance-none w-5 h-5 text-primary bg-white ',
          'rounded-md border-shade-30 border-2',
          'checked:bg-primary checked:border-0',
          disabled && 'opacity-50',
        )}
        onChange={onChange}
      />
      {label && <span className="ml-2 text-gray-700 font-normal">{label}</span>}
    </label>
  </div>
);

export default Checkbox;
