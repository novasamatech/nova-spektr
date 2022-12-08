import cn from 'classnames';
import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  weight?: 'md' | 'lg';
  label?: ReactNode;
  invalid?: boolean;
  wrapperClass?: string;
  disabledStyle?: boolean;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      type = 'text',
      weight = 'lg',
      label = '',
      required,
      placeholder,
      name,
      disabled,
      disabledStyle,
      className,
      wrapperClass,
      value,
      invalid = false,
      prefixElement,
      suffixElement,
      onChange,
    },
    ref,
  ) => (
    <label
      className={cn(
        'relative flex items-center rounded-2lg p-2 box-border border-2',
        'text-sm font-normal leading-5 focus-within:border-primary',
        invalid ? 'border-error' : 'border-shade-2',
        label && 'rounded-2lg text-lg px-2.5 pb-0 pt-5',
        disabledStyle ? 'bg-white' : 'bg-shade-2',
        wrapperClass,
      )}
    >
      {prefixElement}
      {label && (
        <div className="absolute top-2.5 font-bold text-neutral-variant uppercase text-xs w-full pr-5">{label}</div>
      )}
      <input
        className={cn(
          'rounded-sm leading-5 bg-transparent flex-1 focus:outline-none focus:text-primary',
          disabledStyle ? 'text-shade-40' : value && !invalid && 'text-neutral',
          invalid && 'text-error',
          label && 'py-1 my-4',
          prefixElement && 'ml-2',
          suffixElement && 'mr-2',
          className,
        )}
        required={required}
        id={id}
        ref={ref}
        disabled={disabled}
        value={value}
        type={type}
        name={name}
        placeholder={placeholder}
        onChange={onChange}
      />
      {suffixElement}
    </label>
  ),
);

export default Input;
