import { ComponentPropsWithoutRef, forwardRef } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { HTMLTextAreaProps } from '../common/types';
import { CommonInputStylesTheme, InputStyles } from '../common/styles';
import { Theme } from '../../Dropdowns/common/types';

interface Props extends Pick<ComponentPropsWithoutRef<'textarea'>, HTMLTextAreaProps> {
  invalid?: boolean;
  theme?: Theme;
  onChange?: (value: string) => void;
}

export const InputArea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className, invalid, disabled, theme = 'light', onChange, ...props }, ref) => (
    <textarea
      className={cnTw(
        'resize-none py-2 flex-1 focus:outline-none',
        CommonInputStylesTheme[theme],
        !invalid && !disabled && InputStyles.enabled,
        disabled && InputStyles.disabled,
        invalid && InputStyles.invalid,
        className,
      )}
      ref={ref}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
    />
  ),
);
