import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui/Typography';

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
  autosize?: boolean;
  testId?: string;
  invalid?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

export const TextArea = forwardRef<HTMLTextAreaElement, Props>(
  ({ autosize, invalid, disabled, testId = 'TextArea', value, onChange, rows = 3, ...props }, ref) => {
    const textarea = (
      <textarea
        {...props}
        className={cnTw(
          'w-full rounded-sm px-3 py-2',
          'resize-none text-footnote text-text-primary',
          'bg-input-background outline-1 outline-filter-border outline-solid placeholder:text-text-secondary',
          {
            'outline-filter-border-negative': invalid,
            'focus-within:outline-active-container-border hover:shadow-card-shadow focus:outline-1': !disabled,
            'bg-input-background-disabled text-text-tertiary placeholder:text-text-tertiary': disabled,
            'absolute inset-0': autosize,
          },
        )}
        ref={ref}
        rows={rows}
        value={value}
        data-testid={testId}
        data-invalid={invalid}
        disabled={disabled}
        onChange={event => onChange?.(event.target.value)}
      />
    );

    if (autosize) {
      return (
        <div className="relative px-3 py-2 whitespace-pre-wrap" style={{ minHeight: 16 + rows * 18 }}>
          <FootnoteText>{value}&nbsp;</FootnoteText>
          {textarea}
        </div>
      );
    }

    return textarea;
  },
);
