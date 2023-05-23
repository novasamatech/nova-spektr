import cn from 'classnames';
import { ReactNode, ComponentPropsWithoutRef, forwardRef, useId } from 'react';

import { LabelText } from '../../Typography';
import { HTMLInputProps } from '../common/types';
import CommonInputStyles from '@renderer/components/ui-redesign/Inputs/common/styles';

export type Props = Pick<ComponentPropsWithoutRef<'input'>, HTMLInputProps> & {
  label?: ReactNode;
  invalid?: boolean;
  wrapperClass?: string;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  onChange?: (value: string) => void;
};

const Input = forwardRef<HTMLInputElement, Props>(
  (
    {
      type = 'text',
      label,
      className,
      wrapperClass,
      invalid,
      prefixElement,
      suffixElement,
      onChange,
      disabled,
      ...props
    },
    ref,
  ) => {
    const id = useId();

    const inputElement = (
      <div
        className={cn(
          'relative flex object-contain',
          CommonInputStyles,
          !disabled && 'focus-within:border-active-container-border hover:shadow-card-shadow',
          invalid && 'border-filter-border-negative',
          'disabled:bg-input-background-disabled disabled:text-text-tertiary disabled:placeholder:text-text-tertiary',
          'flex-1 border-filter-border',
          wrapperClass,
        )}
      >
        {prefixElement}
        <input
          id={id}
          className={cn('focus:outline-none w-full', className)}
          ref={ref}
          type={type}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          {...props}
        />
        {suffixElement}
      </div>
    );

    if (!label) {
      return inputElement;
    }

    return (
      <div className="flex flex-col gap-2">
        <LabelText className="text-text-tertiary" htmlFor={id}>
          {label}
        </LabelText>
        {inputElement}
      </div>
    );
  },
);

export default Input;
