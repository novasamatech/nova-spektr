import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { cnTw } from '@/shared/lib/utils';

type HTMLTextAreaProps =
  | 'value'
  | 'required'
  | 'disabled'
  | 'placeholder'
  | 'name'
  | 'autoFocus'
  | 'rows'
  | 'maxLength'
  | 'spellCheck';

interface Props extends Pick<ComponentPropsWithoutRef<'textarea'>, HTMLTextAreaProps> {
  testId?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
}

export const TextArea = forwardRef<HTMLTextAreaElement, Props>(
  ({ invalid, disabled, testId, onChange, ...props }, ref) => {
    return (
      <textarea
        className={cnTw(
          'w-full rounded px-[11px] py-[7px]',
          'resize-none text-footnote text-text-primary outline-offset-1',
          'border border-filter-border bg-input-background',
          {
            'border-filter-border-negative': invalid,
            'focus-within:border-active-container-border hover:shadow-card-shadow': !disabled,
            'bg-input-background-disabled text-text-tertiary placeholder:text-text-tertiary': disabled,
          },
        )}
        ref={ref}
        data-testid={testId}
        onChange={(event) => onChange?.(event.target.value)}
        {...props}
      />
    );
  },
);
