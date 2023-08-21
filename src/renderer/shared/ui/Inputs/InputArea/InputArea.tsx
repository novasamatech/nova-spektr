import { ComponentPropsWithoutRef, forwardRef } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { HTMLTextAreaProps } from '../common/types';
import { CommonInputStyles, CommonInputStylesTheme } from '../common/styles';
import { Theme } from '../../Dropdowns/common/types';

interface Props extends Pick<ComponentPropsWithoutRef<'textarea'>, HTMLTextAreaProps> {
  invalid?: boolean;
  theme?: Theme;
  onChange?: (value: string) => void;
}

export const InputArea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className, invalid, theme = 'light', onChange, ...props }, ref) => (
    <textarea
      className={cnTw(
        'resize-none py-2 flex-1',
        CommonInputStyles,
        CommonInputStylesTheme[theme],
        'focus-within:enabled:border-border-focus focus:outline-none',
        'disabled:bg-input-background-disabled disabled:text-text-tertiary disabled:placeholder:text-text-tertiary',
        !invalid &&
          'enabled:focus-within:border-border-accent enabled:hover:focus-within:border-border-accent enabled:hover:border-border-secondary',
        'disabled:bg-bg-secondary disabled:text-text-tertiary',
        invalid && 'border-border-negative',
        className,
      )}
      ref={ref}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
    />
  ),
);
