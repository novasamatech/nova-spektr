import cn from 'classnames';
import { ReactNode, ComponentPropsWithoutRef, forwardRef, useId } from 'react';

import { FootnoteText } from '../../Typography';
import { HTMLInputProps } from '../common/types';
import commonInputStyles from '@renderer/components/ui-redesign/Inputs/common/styles';

export interface Props extends Pick<ComponentPropsWithoutRef<'input'>, HTMLInputProps> {
  label?: ReactNode;
  invalid?: boolean;
  wrapperClass?: string;
  suffixElement?: ReactNode;
  onChange?: (value: string) => void;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ type = 'text', label, className, wrapperClass, invalid, suffixElement, onChange, ...props }, ref) => {
    const id = useId();

    const inputElement = (
      <div className={cn('relative flex object-contain', wrapperClass)}>
        <input
          id={id}
          className={cn(
            commonInputStyles,
            'focus-within:enabled:border-active-container-border',
            invalid && 'border-filter-border-negative',
            'hover:enabled:shadow-card-shadow',
            'disabled:bg-input-background-disabled disabled:text-text-tertiary disabled:placeholder:text-text-tertiary',
            'outline-0', // until custom outline is developed
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
      <div className="flex flex-col">
        <FootnoteText as="label" htmlFor={id} className="mb-2">
          {label}
        </FootnoteText>
        {inputElement}
      </div>
    );
  },
);

export default Input;
