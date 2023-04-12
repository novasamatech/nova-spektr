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
};

const Button = ({
  variant,
  pallet,
  type = 'button',
  size = 'big',
  form,
  className,
  disabled,
  children,
  prefixElement,
  suffixElement,
  onClick = noop,
}: PropsWithChildren<Props>) => (
  <button
    type={type}
    form={form}
    disabled={disabled}
    className={cn(
      'flex items-center justify-center gap-x-2.5 font-semibold select-none',
      SizeClass[size],
      ViewClass[`${variant}_${pallet}`],
      className,
    )}
    onClick={onClick}
  >
    {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
    <div className={cn(prefixElement && 'ml-auto', suffixElement && 'ml-0 mr-auto')}>{children}</div>
    {suffixElement && <div data-testid="suffix">{suffixElement}</div>}
  </button>
);

export default Button;
