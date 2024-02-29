import { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cnTw } from '@shared/lib/utils';
import { ViewClass, SizeClass, Padding } from '../common/constants';
import { Pallet, Variant } from '../common/types';

type Props = {
  to: string;
  className?: string;
  variant?: Variant;
  pallet?: Pallet;
  size?: keyof typeof SizeClass;
  disabled?: boolean;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  callback?: () => void;
};

const ButtonLink = ({
  to,
  variant = 'fill',
  pallet = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  prefixElement,
  suffixElement,
  callback,
}: PropsWithChildren<Props>) => {
  const classes = cnTw(
    'flex items-center justify-center gap-x-2 font-medium select-none outline-offset-1',
    SizeClass[size],
    variant !== 'text' && Padding[size],
    ViewClass[`${variant}_${pallet}`],
    className,
  );

  const content = (
    <>
      {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
      <div className={cnTw(prefixElement && 'ml-auto', suffixElement && 'ml-0 mr-auto')}>{children}</div>
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
