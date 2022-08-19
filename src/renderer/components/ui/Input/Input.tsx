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
          'relative inline-block text-lg leading-5',
          value ? 'border-primary' : 'border-shade-20',
          invalid && 'border-error',
          label ? 'bg-shade-2 rounded-2lg p-2.5 pt-5' : 'border-b',
          wrapperClass,
        )}
      >
        {prefixElement && <span>{prefixElement}</span>}
        {label && <span className="absolute top-2.5 font-bold text-neutral-variant uppercase text-xs">{label}</span>}
        <input
          className={cn(
            'focus:outline-none focus-visible:ring rounded-sm py-3 bg-transparent flex-1',
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
        {suffixElement && <span>{suffixElement}</span>}
      </label>
    );
  },
);

export default Input;
