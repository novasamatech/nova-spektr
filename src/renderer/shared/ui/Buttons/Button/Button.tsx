import noop from 'lodash/noop';
import { MouseEvent, PropsWithChildren, ReactNode, forwardRef } from 'react';

import { cnTw } from '@shared/lib/utils';
import { ViewClass, SizeClass, Padding } from '../common/constants';
import { Pallet, Variant } from '../common/types';
import { Loader } from '../../Loader/Loader';

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
  isLoading?: boolean;
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
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      form={form}
      disabled={disabled}
      className={cnTw(
        'flex items-center justify-center gap-x-2 select-none outline-offset-1 transition-colors',
        (prefixElement || suffixElement || isLoading) && 'justify-between',
        SizeClass[size],
        variant !== 'text' && Padding[size],
        ViewClass[`${variant}_${pallet}`],
        className,
      )}
      tabIndex={tabIndex}
      onClick={(e) => !isLoading && onClick(e)}
    >
      {isLoading && <Loader color="white" />}
      {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
      <div>{children}</div>
      {suffixElement && <div data-testid="suffix">{suffixElement}</div>}
    </button>
  ),
);
