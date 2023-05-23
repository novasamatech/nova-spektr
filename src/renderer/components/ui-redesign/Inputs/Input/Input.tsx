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
    { type = 'text', label, className, wrapperClass, invalid, prefixElement, suffixElement, onChange, ...props },
    ref,
  ) => {
    const id = useId();

    const inputElement = (
      <div className={cnTw('relative flex object-contain', wrapperClass)}>
        {prefixElement}
        <input
          id={id}
          className={cnTw(
            CommonInputStyles,
            'focus-within:enabled:border-active-container-border',
            invalid && 'border-filter-border-negative',
            'hover:enabled:shadow-card-shadow',
            'disabled:bg-input-background-disabled disabled:text-text-tertiary disabled:placeholder:text-text-tertiary',
            'flex-1 border-filter-border',
            className,
          )}
          ref={ref}
          type={type}
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
        <LabelText htmlFor={id}>{label}</LabelText>
        {inputElement}
      </div>
    );
  },
);

export default Input;
