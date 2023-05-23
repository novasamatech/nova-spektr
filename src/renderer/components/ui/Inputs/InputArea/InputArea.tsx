import { ComponentPropsWithoutRef, forwardRef } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import CommonInputStyles from '@renderer/components/ui-redesign/Inputs/common/styles';
import { HTMLTextAreaProps } from '../common/types';

interface Props extends Pick<ComponentPropsWithoutRef<'textarea'>, HTMLTextAreaProps> {
  invalid?: boolean;
  onChange?: (value: string) => void;
}

const InputArea = forwardRef<HTMLTextAreaElement, Props>(({ className, invalid = false, onChange, ...props }, ref) => (
  <textarea
    className={cnTw(
      'resize-none text-footnote flex-1',
      CommonInputStyles,
      'focus-within:enabled:border-active-container-border',
      invalid && 'border-filter-border-negative',
      'hover:enabled:shadow-card-shadow',
      'disabled:bg-input-background-disabled disabled:text-text-tertiary disabled:placeholder:text-text-tertiary',
      'flex-1 border-filter-border',
      className,
    )}
    ref={ref}
    onChange={(event) => onChange?.(event.target.value)}
    {...props}
  />
));

export default InputArea;
