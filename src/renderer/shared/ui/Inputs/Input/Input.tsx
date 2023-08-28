import { ReactNode, ComponentPropsWithoutRef, forwardRef, useId } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { LabelText } from '../../Typography';
import { HTMLInputProps, Theme } from '../common/types';
import { CommonInputStylesTheme, InputStyles } from '../common/constants';

export type Props = Pick<ComponentPropsWithoutRef<'input'>, HTMLInputProps> & {
  label?: ReactNode;
  invalid?: boolean;
  wrapperClass?: string;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  theme?: Theme;
  onChange?: (value: string) => void;
};

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
      disabled,
      spellCheck = false,
      theme = 'light',
      ...props
    },
    ref,
  ) => {
    const id = useId();

    const inputElement = (
      <div
        className={cnTw(
          'input-wrapper relative flex object-contain gap-x-2',
          CommonInputStylesTheme[theme],
          InputStyles.base,
          !invalid && !disabled && InputStyles.enabled,
          disabled && InputStyles.disabled,
          invalid && InputStyles.invalid,
          wrapperClass,
        )}
      >
        {prefixElement}
        <input
          id={id}
          className={cnTw(
            'focus:outline-none w-full placeholder:text-text-secondary bg-transparent',
            disabled && 'text-text-tertiary placeholder:text-text-tertiary',
            className,
          )}
          ref={ref}
          type={type}
          disabled={disabled}
          spellCheck={spellCheck}
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
        <LabelText className="text-text-tertiary font-medium" htmlFor={id}>
          {label}
        </LabelText>
        {inputElement}
      </div>
    );
  },
);
