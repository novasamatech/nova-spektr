import { type ClipboardEvent, type ComponentPropsWithoutRef, type ReactNode, forwardRef, useId } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { type Theme } from '../../Dropdowns/common/types';
import { LabelText } from '../../Typography';
import { CommonInputStyles, CommonInputStylesTheme } from '../common/styles';
import { type HTMLInputProps } from '../common/types';

type NewType = {
  label?: ReactNode;
  invalid?: boolean;
  wrapperClass?: string;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  theme?: Theme;
  onChange?: (value: string) => void;
  onPaste?: (event: ClipboardEvent) => void;
  testId?: string;
};

export type Props = Pick<ComponentPropsWithoutRef<'input'>, HTMLInputProps> & NewType;

export const Input = forwardRef<HTMLInputElement, Props>(
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
      onPaste,
      disabled,
      spellCheck = false,
      theme = 'light',
      autoFocus,
      testId,
      ...props
    },
    ref,
  ) => {
    const id = useId();

    const inputElement = (
      <div
        className={cnTw(
          'relative flex items-center object-contain',
          CommonInputStyles,
          CommonInputStylesTheme[theme],
          !disabled && 'hover:shadow-card-shadow',
          !invalid && 'focus-within:border-active-container-border',
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
            'w-full placeholder:text-text-secondary focus:outline-none',
            disabled && 'bg-transparent text-text-tertiary placeholder:text-text-tertiary',
            className,
          )}
          ref={ref}
          type={type}
          autoFocus={autoFocus}
          disabled={disabled}
          spellCheck={spellCheck}
          data-testid={testId}
          onChange={(event) => onChange?.(event.target.value)}
          onPaste={(event) => onPaste?.(event)}
          {...props}
        />
        {suffixElement}
      </div>
    );

    if (!label) {
      return inputElement;
    }

    return (
      <div className="flex flex-col gap-y-2">
        <LabelText className="font-medium text-text-tertiary" htmlFor={id}>
          {label}
        </LabelText>
        {inputElement}
      </div>
    );
  },
);
