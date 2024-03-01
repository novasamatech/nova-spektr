import { Identicon as PolkadotIdenticon } from '@polkadot/react-identicon';
import { IconTheme } from '@polkadot/react-identicon/types';
import { useLayoutEffect, useRef, SyntheticEvent } from 'react';

import { cnTw, copyToClipboard, isEthereumAccountId } from '@shared/lib/utils';
import { AccountId, Address } from '@shared/core';
import { Icon } from '../Icon/Icon';

type Props = {
  theme?: IconTheme;
  address?: Address;
  size?: number;
  background?: boolean;
  canCopy?: boolean;
  className?: string;
  buttonClassName?: string;
};

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
    <PolkadotIdenticon
      theme={theme || defaultTheme}
      value={address}
      size={background ? size * 0.75 : size}
      className="pointer-events-none rounded-full overflow-hidden"
    />
  ) : (
    <Icon name="emptyIdenticon" size={size} />
  );

  if (!canCopy || !address) {
    return (
      <div
        ref={wrapperRef}
        className={cnTw('relative flex justify-center items-center', background && 'bg-white rounded-full', className)}
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
          'relative flex justify-center items-center cursor-copy rounded-sm',
          background && 'bg-white rounded-full',
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
