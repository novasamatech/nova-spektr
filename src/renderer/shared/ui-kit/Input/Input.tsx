import {
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useId,
} from 'react';

import { cnTw } from '@/shared/lib/utils';

type HTMLInputProps = 'value' | 'disabled' | 'placeholder' | 'name' | 'autoFocus' | 'type' | 'spellCheck';

type ComponentProps = {
  invalid?: boolean;
  height?: 'sm' | 'md';
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  testId?: string;
  onChange?: (value: string) => void;
  onChangeEvent?: (event: ChangeEvent<HTMLInputElement>) => void;
  onPaste?: (event: ClipboardEvent) => void;
};

export type InputProps = Pick<ComponentPropsWithoutRef<'input'>, HTMLInputProps> & ComponentProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      height = 'sm',
      name,
      value,
      placeholder,
      invalid,
      disabled,
      autoFocus,
      spellCheck = false,
      prefixElement,
      suffixElement,
      testId,
      onChange,
      onChangeEvent,
      onPaste,
      ...props
    },
    ref,
  ) => {
    const id = useId();

    return (
      <label
        className={cnTw(
          'flex cursor-text items-center gap-x-2 rounded px-[11px]',
          'border border-filter-border bg-input-background',
          {
            'h-[34px]': height === 'sm',
            'h-[42px]': height === 'md',
            'border-filter-border-negative': invalid,
            'focus-within:border-active-container-border': !invalid,
            'hover:shadow-card-shadow': !disabled,
            'bg-input-background-disabled': disabled,
          },
        )}
      >
        {prefixElement ? <div className="shrink-0">{prefixElement}</div> : prefixElement}
        <input
          className={cnTw(
            'h-full w-full appearance-none placeholder:text-text-secondary focus:outline-none',
            'text-footnote text-text-primary outline-offset-1',
            {
              'bg-transparent text-text-tertiary placeholder:text-text-tertiary': disabled,
            },
          )}
          id={id}
          ref={ref}
          type={type}
          data-testid={testId}
          autoFocus={autoFocus}
          disabled={disabled}
          spellCheck={spellCheck}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={event => {
            onChange?.(event.target.value);
            onChangeEvent?.(event);
          }}
          onPaste={event => onPaste?.(event)}
          {...props}
        />
        {suffixElement ? <div className="shrink-0">{suffixElement}</div> : suffixElement}
      </label>
    );
  },
);
