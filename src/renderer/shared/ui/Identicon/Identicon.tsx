import { Identicon as PolkadotIdenticon } from '@polkadot/react-identicon';
import { IconTheme } from '@polkadot/react-identicon/types';
import { memo, SyntheticEvent, useLayoutEffect, useRef } from 'react';

import { cnTw, copyToClipboard } from '@renderer/shared/lib/utils';
import { Address } from '@renderer/domain/shared-kernel';
import { Icon, IconSize } from '../Icon/Icon';

type Props = IconSize & {
  theme?: IconTheme;
  address?: Address;
  background?: boolean;
  canCopy?: boolean;
  className?: string;
  buttonClassName?: string;
};

const Identicon = ({
  theme = 'polkadot',
  address,
  size = 16,
  background = true,
  canCopy = true,
  className,
  buttonClassName,
}: Props) => {
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
      theme={theme}
      value={address}
      size={background ? size * 0.75 : size}
      className="pointer-events-none"
    />
  ) : (
    <Icon name="identicon-placeholder" size={size} />
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

export default memo(Identicon);
