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
  onClick?: VoidFunction;
  inline?: boolean;
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
  onClick,
  inline = false,
}: PropsWithChildren<Props>) => {
  const classes = cnTw(
    inline
      ? 'inline cursor-pointer font-medium'
      : 'flex cursor-pointer items-center justify-center gap-x-2 font-medium outline-offset-1 select-none',
    {
      'cursor-not-allowed': disabled,
    },
    !inline && SizeClass[size],
    !inline && variant !== 'text' && Padding[size],
    inline
      ? cnTw('border-transparent bg-transparent text-primary-button-background-default', {
          'text-primary-button-background-inactive': disabled,
          'hover:text-primary-button-background-hover active:text-primary-button-background-active': !disabled,
        })
      : ViewClass[`${variant}_${pallet}`](disabled),
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
    <Link to={to} className={classes} onClick={onClick}>
      {content}
    </Link>
  );
};
