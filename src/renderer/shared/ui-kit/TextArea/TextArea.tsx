import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { cnTw } from '@/shared/lib/utils';

type HTMLTextAreaProps =
  | 'value'
  | 'disabled'
  | 'placeholder'
  | 'name'
  | 'autoFocus'
  | 'rows'
  | 'maxLength'
  | 'spellCheck';

type Props = Pick<ComponentPropsWithoutRef<'textarea'>, HTMLTextAreaProps> & {
  testId?: string;
  invalid?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export const TextArea = forwardRef<HTMLTextAreaElement, Props>(
  ({ invalid, disabled, testId = 'TextArea', value, onChange, ...props }, ref) => {
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
        value={value}
        data-testid={testId}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    );
  },
);
