import { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import cnTw from '@renderer/shared/utils/twMerge';
import { ViewClass, WeightClass } from '../common/constants';
import { Pallet, Variant } from '../common/types';

type Props = {
  to: string;
  className?: string;
  variant: Variant;
  pallet: Pallet;
  weight?: keyof typeof WeightClass;
  disabled?: boolean;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  callback?: () => void;
};

const ButtonLink = ({
  to,
  variant,
  pallet,
  weight = 'md',
  className,
  disabled,
  children,
  prefixElement,
  suffixElement,
  callback,
}: PropsWithChildren<Props>) => {
  const classes = cnTw(
    'flex items-center justify-center gap-x-2.5 border font-semibold select-none',
    WeightClass[weight],
    ViewClass[`${variant}_${disabled ? 'shade' : pallet}`],
    className,
  );

  const content = (
    <>
      {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
      <div className={cnTw((prefixElement || suffixElement) && 'ml-0 mr-auto')}>{children}</div>
      {suffixElement && <div data-testid="suffix">{suffixElement}</div>}
    </>
  );

  return disabled ? (
    <div className={classes}>{content}</div>
  ) : (
    <Link to={to} className={classes} onClick={callback}>
      {content}
    </Link>
  );
};

export default ButtonLink;
