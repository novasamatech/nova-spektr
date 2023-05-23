import { ReactNode, ComponentPropsWithoutRef, forwardRef } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { HTMLInputProps } from '../common/types';

interface Props extends Pick<ComponentPropsWithoutRef<'input'>, HTMLInputProps> {
  label?: ReactNode;
  disabledStyle?: boolean;
  invalid?: boolean;
  wrapperClass?: string;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  onChange?: (value: string) => void;
}

const Input = forwardRef<HTMLInputElement, Props>(
  (
    {
      type = 'text',
      label = '',
      disabledStyle,
      className,
      wrapperClass,
      invalid = false,
      prefixElement,
      suffixElement,
      onChange,
      ...props
    },
    ref,
  ) => (
    <label
      className={cnTw(
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
        <div className="absolute top-2.5 font-bold text-neutral-variant uppercase text-2xs w-full pr-5">{label}</div>
      )}
      <input
        className={cnTw(
          'rounded-sm leading-5 bg-transparent flex-1 placeholder-shade-30 focus:text-primary',
          disabledStyle ? 'text-shade-40' : props.value && !invalid && 'text-neutral',
          invalid && 'text-error',
          label && 'py-1 my-4',
          prefixElement && 'ml-2',
          suffixElement && 'mr-2',
          className,
        )}
        ref={ref}
        type={type}
        onChange={(event) => onChange?.(event.target.value)}
        {...props}
      />
      {suffixElement}
    </label>
  ),
);

export default Input;
