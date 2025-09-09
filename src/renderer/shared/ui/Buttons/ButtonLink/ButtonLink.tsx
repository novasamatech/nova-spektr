import { type PropsWithChildren, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cnTw } from '@/shared/lib/utils';
import { Padding, SizeClass, ViewClass } from '../common/constants';
import { type Pallet, type Variant } from '../common/types';

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

export const ButtonLink = ({
  to,
  variant = 'fill',
  pallet = 'primary',
  size = 'md',
  className,
  disabled = false,
  children,
  prefixElement,
  suffixElement,
  callback,
}: PropsWithChildren<Props>) => {
  const classes = cnTw(
    'flex cursor-pointer items-center justify-center gap-x-2 font-medium outline-offset-1 select-none',
    {
      'cursor-not-allowed': disabled,
    },
    SizeClass[size],
    variant !== 'text' && Padding[size],
    ViewClass[`${variant}_${pallet}`](disabled),
    className,
  );

  const content = (
    <>
      {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
      <div
        className={cnTw({
          'ml-auto': prefixElement,
          'mr-auto ml-0': suffixElement,
        })}
      >
        {children}
      </div>
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
