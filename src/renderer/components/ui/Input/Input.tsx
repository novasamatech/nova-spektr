import cn from 'classnames';
import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  weight?: 'md' | 'lg';
  label?: string;
  invalid?: boolean;
  wrapperClass?: string;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
}

type Ref = HTMLInputElement;

const Input = forwardRef<Ref, InputProps>(
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
      className,
      wrapperClass,
      value,
      invalid = false,
      prefixElement,
      suffixElement,
      onChange,
    },
    ref,
  ) => {
    return (
      <label
        className={cn(
          'relative flex items-center rounded-2lg p-2.5 box-border border-2 bg-shade-2 text-sm font-normal leading-5',
          invalid ? 'border-error' : 'border-shade-2',
          label && 'rounded-2lg text-lg px-2.5 pb-0 pt-5',
          wrapperClass,
        )}
      >
        {prefixElement}
        {label && <span className="absolute top-2.5 font-bold text-neutral-variant uppercase text-xs">{label}</span>}
        <input
          className={cn(
            'focus:outline-none rounded-sm leading-5 bg-transparent flex-1',
            value && !invalid && 'text-primary',
            invalid && 'text-error',
            label && 'py-1 my-4',
            prefixElement && 'ml-3',
            suffixElement && 'mr-3',
            className,
          )}
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
    );
  },
);

export default Input;
