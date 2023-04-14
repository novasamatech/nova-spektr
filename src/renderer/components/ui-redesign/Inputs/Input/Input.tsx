import cn from 'classnames';
import { ReactNode, ComponentPropsWithoutRef, forwardRef, useId } from 'react';

import { FootnoteText } from '../../Typography';
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
          <label htmlFor={id} className="mb-2">
            <FootnoteText>{label}</FootnoteText>
          </label>
        )}

        <div className={cn('relative flex object-contain', wrapperClass)}>
          <input
            id={id}
            className={cn(
              // TODO add placeholder and hover styles when ready and change border color name
              'rounded text-text-primary text-body bg-main-app-background flex-1 py-[7px] pl-[8px] focus:shadow-input-active-shadow focus:outline-none border border-container-border focus:border-icon-accent',
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
