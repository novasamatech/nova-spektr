import cn from 'classnames';
import noop from 'lodash/noop';
import { MouseEvent, PropsWithChildren, ReactNode } from 'react';

import { ViewClass, SizeClass } from '../common/constants';
import { Pallet, Variant } from '../common/types';

type Props = {
  className?: string;
  type?: 'button' | 'submit';
  form?: string;
  variant: Variant;
  pallet: Pallet;
  size?: keyof typeof SizeClass;
  disabled?: boolean;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  tabIndex?: number;
};

const Button = ({
  variant,
  pallet,
  type = 'button',
  size = 'md',
  form,
  className,
  disabled,
  children,
  prefixElement,
  suffixElement,
  onClick = noop,
  tabIndex,
}: PropsWithChildren<Props>) => (
  <button
    type={type}
    form={form}
    disabled={disabled}
    className={cn(
      'flex items-center justify-center gap-x-2 font-medium select-none outline-offset-1',
      SizeClass[size],
      ViewClass[`${variant}_${pallet}`],
      // primary fill button has linear gradient bg for hover & active
      // Can't use tailwind here cause bg- resolves into background-color it doesn't work with linear gradient
      { 'active-styles': variant === 'fill' && pallet === 'primary' },
      className,
    )}
    tabIndex={tabIndex}
    onClick={onClick}
  >
    {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
    <div className={cn(prefixElement && 'ml-auto', suffixElement && 'ml-0 mr-auto')}>{children}</div>
    {suffixElement && <div data-testid="suffix">{suffixElement}</div>}
  </button>
);

export default Button;
