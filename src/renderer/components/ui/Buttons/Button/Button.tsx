import noop from 'lodash/noop';
import { MouseEvent, PropsWithChildren, ReactNode } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { ViewClass, WeightClass } from '../common/constants';
import { Pallet, Variant } from '../common/types';

type Props = {
  className?: string;
  type?: 'button' | 'submit';
  form?: string;
  variant: Variant;
  pallet: Pallet;
  weight?: keyof typeof WeightClass;
  disabled?: boolean;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

const Button = ({
  variant,
  pallet,
  type = 'button',
  weight = 'md',
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
    className={cnTw(
      'flex items-center justify-center gap-x-2.5 border font-semibold select-none',
      WeightClass[weight],
      ViewClass[`${variant}_${disabled ? 'shade' : pallet}`],
      className,
    )}
    onClick={onClick}
  >
    {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
    <div className={cnTw(prefixElement && 'ml-auto', suffixElement && 'ml-0 mr-auto')}>{children}</div>
    {suffixElement && <div data-testid="suffix">{suffixElement}</div>}
  </button>
);

export default Button;
