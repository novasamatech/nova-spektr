import { type IconTheme } from '@polkadot/react-identicon/types';
import { Suspense, type SyntheticEvent, lazy, useLayoutEffect, useRef } from 'react';

import { type Address } from '@/shared/core';
import { cnTw, copyToClipboard, isEthereumAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Icon } from '../Icon/Icon';

type Props = {
  theme?: IconTheme;
  address?: Address;
  size?: number;
  background?: boolean;
  canCopy?: boolean;
  className?: string;
  buttonClassName?: string;
  testId?: string;
};

const PolkadotIdenticon = lazy(() => import('@polkadot/react-identicon').then((m) => ({ default: m.Identicon })));

export const Identicon = ({
  theme,
  address,
  size = 24,
  background = true,
  canCopy = true,
  className,
  buttonClassName,
}: Props) => {
  const defaultTheme = address && isEthereumAccountId(address as AccountId) ? 'ethereum' : 'polkadot';

  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    wrapperRef.current.querySelector('circle')?.setAttribute('fill', 'none');
  }, []);

  const onCopyToClipboard = async (e: SyntheticEvent) => {
    e.stopPropagation();
    await copyToClipboard(address);
  };

  const icon = address ? (
    <Suspense fallback={<Icon name="emptyIdenticon" size={size} />}>
      <PolkadotIdenticon
        theme={theme || defaultTheme}
        value={address}
        size={background ? size * 0.75 : size}
        className="pointer-events-none overflow-hidden rounded-full"
      />
    </Suspense>
  ) : (
    <Icon name="emptyIdenticon" size={size} />
  );

  if (!canCopy || !address) {
    return (
      <div
        ref={wrapperRef}
        className={cnTw('relative flex items-center justify-center', background && 'rounded-full bg-white', className)}
        style={{ width: size, height: size }}
        data-testid={`identicon-${address}`}
      >
        {icon}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={className}>
      <button
        type="button"
        className={cnTw(
          'relative flex cursor-copy items-center justify-center rounded-sm',
          background && 'rounded-full bg-white',
          buttonClassName,
        )}
        style={{ width: size, height: size }}
        data-testid={`identicon-${address}`}
        onClick={onCopyToClipboard}
      >
        {icon}
      </button>
    </div>
  );
};
