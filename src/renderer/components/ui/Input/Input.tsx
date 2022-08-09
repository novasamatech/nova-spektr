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
          'relative inline-block border-b text-lg leading-5',
          value ? 'border-primary' : 'border-shade-20',
          invalid && 'border-error',
          wrapperClass,
        )}
      >
        {prefixElement && <span>{prefixElement}</span>}
        {/*{label && <span className="absolute top-1/2 -translate-y-1/2">{label}</span>}*/}
        <input
          className={cn(
            'focus:outline-none focus-visible:ring rounded-sm py-3 bg-transparent',
            value && !invalid && 'text-primary',
            invalid && 'text-error',
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
