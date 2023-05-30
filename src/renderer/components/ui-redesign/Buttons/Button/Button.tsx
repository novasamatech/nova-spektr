import noop from 'lodash/noop';
import { MouseEvent, PropsWithChildren, ReactNode, forwardRef } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { ViewClass, SizeClass, Padding } from '../common/constants';
import { Pallet, Variant } from '../common/types';

type Props = {
  className?: string;
  type?: 'button' | 'submit';
  form?: string;
  variant?: Variant;
  pallet?: Pallet;
  size?: keyof typeof SizeClass;
  disabled?: boolean;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  tabIndex?: number;
};

const Button = forwardRef<HTMLButtonElement, PropsWithChildren<Props>>(
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
      onClick = noop,
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      form={form}
      disabled={disabled}
      className={cnTw(
        'flex items-center justify-center gap-x-2 font-medium select-none outline-offset-1',
        (prefixElement || suffixElement) && 'justify-between',
        SizeClass[size],
        variant !== 'text' && Padding[size],
        ViewClass[`${variant}_${pallet}`],
        className,
      )}
      tabIndex={tabIndex}
      onClick={onClick}
    >
      {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
      <div>{children}</div>
      {suffixElement && <div data-testid="suffix">{suffixElement}</div>}
    </button>
  ),
);

export default Button;
