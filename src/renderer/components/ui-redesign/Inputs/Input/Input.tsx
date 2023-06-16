import { ReactNode, ComponentPropsWithoutRef, forwardRef, useId } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
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
        className={cnTw(
          'relative flex object-contain',
          CommonInputStyles,
          !disabled && 'focus-within:border-active-container-border hover:shadow-card-shadow',
          disabled && 'bg-input-background-disabled text-text-tertiary',
          'border-filter-border',
          invalid && 'border-filter-border-negative',
          wrapperClass,
        )}
      >
        {prefixElement}
        <input
          id={id}
          className={cnTw(
            'focus:outline-none w-full placeholder:text-text-secondary',
            disabled && 'text-text-tertiary placeholder:text-text-tertiary',
            className,
          )}
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
