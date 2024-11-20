import {
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { cnTw } from '@/shared/lib/utils';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

import { type HTMLInputProps } from './types';

type ComponentProps = {
  label?: ReactNode;
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

const DEFAULT_HORIZONTAL_PADDING = gridSpaceConverter(3) - 1;
const EXTENDED_HORIZONTAL_PADDING = gridSpaceConverter(5) - 1;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      height = 'md',
      label,
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

    const prefixRef = useRef<HTMLDivElement>(null);
    const suffixRef = useRef<HTMLDivElement>(null);

    const [paddingLeft, setPaddingLeft] = useState(DEFAULT_HORIZONTAL_PADDING);
    const [paddingRight, setPaddingRight] = useState(DEFAULT_HORIZONTAL_PADDING);

    useLayoutEffect(() => {
      if (!prefixElement || !prefixRef.current) return;

      setPaddingLeft(EXTENDED_HORIZONTAL_PADDING + prefixRef.current.getBoundingClientRect().width);
    }, [prefixElement]);

    useLayoutEffect(() => {
      if (!suffixElement || !suffixRef.current) return;

      setPaddingRight(EXTENDED_HORIZONTAL_PADDING + suffixRef.current.getBoundingClientRect().width);
    }, [suffixElement]);

    const inputElement = (
      <div className="relative w-full">
        <div
          ref={prefixRef}
          className={cnTw(!prefixElement && 'hidden', 'absolute left-3 top-1/2 flex -translate-y-1/2')}
        >
          {prefixElement}
        </div>
        <input
          className={cnTw(
            'w-full rounded py-[11px]',
            'border border-filter-border bg-input-background',
            'placeholder:text-text-secondary focus:outline-none',
            'text-footnote text-text-primary outline-offset-1',
            {
              'py-[7px]': height === 'sm',
              'border-filter-border-negative': invalid,
              'focus-within:border-active-container-border': !invalid,
              'hover:shadow-card-shadow': !disabled,
              'bg-transparent text-text-tertiary placeholder:text-text-tertiary': disabled,
            },
          )}
          style={{ paddingLeft, paddingRight }}
          id={id}
          ref={ref}
          type={type}
          autoFocus={autoFocus}
          disabled={disabled}
          spellCheck={spellCheck}
          data-testid={testId}
          onChange={(event) => {
            onChange?.(event.target.value);
            onChangeEvent?.(event);
          }}
          onPaste={(event) => onPaste?.(event)}
          {...props}
        />
        <div
          ref={suffixRef}
          className={cnTw(!suffixElement && 'hidden', 'absolute right-3 top-1/2 flex -translate-y-1/2')}
        >
          {suffixElement}
        </div>
      </div>
    );

    if (!label) {
      return inputElement;
    }

    return (
      <div className="flex flex-col gap-y-2">
        <label htmlFor={id} className="text-footnote font-medium text-text-tertiary">
          {label}
        </label>
        {inputElement}
      </div>
    );
  },
);
