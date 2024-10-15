import noop from 'lodash/noop';
import { type ComponentProps, type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Loader } from '../../Loader/Loader';
import { Padding, SizeClass, ViewClass } from '../common/constants';
import { type Pallet, type Variant } from '../common/types';

type HTMLButtonProps = Pick<
  ComponentProps<'button'>,
  'onClick' | 'onMouseDown' | 'onPointerDown' | 'onPointerMove' | 'onPointerLeave' | 'disabled' | 'tabIndex' | 'type'
>;
type Props = HTMLButtonProps & {
  className?: string;
  form?: string;
  variant?: Variant;
  pallet?: Pallet;
  size?: keyof typeof SizeClass;
  isLoading?: boolean;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  testId?: string;
};

export const Button = forwardRef<HTMLButtonElement, PropsWithChildren<Props>>(
  (
    {
      variant = 'fill',
      pallet = 'primary',
      type = 'button',
      size = 'md',
      form,
      className,
      disabled,
      prefixElement,
      suffixElement,
      tabIndex,
      children,
      isLoading,
      onClick = noop,
      onMouseDown = noop,
      onPointerDown = noop,
      onPointerMove,
      onPointerLeave,
      testId = 'Button',
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      form={form}
      disabled={disabled}
      className={cnTw(
        'flex select-none items-center justify-center gap-x-2 outline-offset-1 transition-colors',
        (prefixElement || suffixElement || isLoading) && 'justify-between',
        SizeClass[size],
        variant !== 'text' && Padding[size],
        ViewClass[`${variant}_${pallet}`],
        className,
      )}
      tabIndex={tabIndex}
      data-testid={testId}
      onClick={(e) => !isLoading && onClick(e)}
      onMouseDown={(e) => !isLoading && onMouseDown(e)}
      onPointerDown={(e) => !isLoading && onPointerDown(e)}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {isLoading && <Loader color="white" />}
      {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
      <div>{children}</div>
      {suffixElement && <div data-testid="suffix">{suffixElement}</div>}
    </button>
  ),
);
