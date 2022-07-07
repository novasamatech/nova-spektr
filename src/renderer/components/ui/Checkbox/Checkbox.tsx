import React, { InputHTMLAttributes } from 'react';
import cn from 'classnames';
import './checkbox.css';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox: React.FC<Props> = ({ label, checked, disabled, className, onChange }) => {
  return (
    <div className={cn({ 'hover:cursor-pointer': disabled }, className)}>
      <label className="flex items-center">
        <input
          type="checkbox"
          name="checkbox"
          disabled={disabled}
          checked={checked}
          onChange={onChange}
          className={cn(
            'relative',
            'appearance-none w-5 h-5 text-primary bg-white ',
            'rounded-md border-shadow-30 border-2',
            'checked:bg-primary checked:border-0',
            {
              'opacity-50': disabled,
            },
          )}
        />
        {label && <span className="ml-2 text-gray-700 font-normal">{label}</span>}
      </label>
    </div>
  );
};
export default Checkbox;
