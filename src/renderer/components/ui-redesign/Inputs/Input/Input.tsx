import cn from 'classnames';
import { ReactNode, ComponentPropsWithoutRef, forwardRef, useId } from 'react';

import { HTMLInputProps } from '../common/types';

export interface Props extends Pick<ComponentPropsWithoutRef<'input'>, HTMLInputProps> {
  label?: ReactNode;
  disabledStyle?: boolean;
  invalid?: boolean;
  wrapperClass?: string;
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
      suffixElement,
      onChange,
      ...props
    },
    ref,
  ) => {
    const id = useId();

    return (
      <div className="flex flex-col">
        {label && (
          <label htmlFor={id} className="text-callout mb-2">
            {label}
          </label>
        )}

        <div className={cn('relative flex object-contain', wrapperClass)}>
          <input
            id={id}
            className={cn(
              'rounded text-body bg-redesign-secondary-bg flex-1 py-[7px] pl-2 focus:shadow-active-input focus:outline-none border border-redesign-gray-border focus:border-redesign-primary', // TODO add placeholder styles when ready
              className,
            )}
            ref={ref}
            type={type}
            onChange={(event) => onChange?.(event.target.value)}
            {...props}
          />
          {suffixElement}
        </div>
      </div>
    );
  },
);

export default Input;
