import { Identicon as PolkadotIdenticon } from '@polkadot/react-identicon';
import { IconTheme } from '@polkadot/react-identicon/types';
import cn from 'classnames';
import { ReactNode, useLayoutEffect, useRef, memo } from 'react';

import { SigningType } from '@renderer/domain/shared-kernel';
import { copyToClipboard } from '@renderer/shared/utils/strings';
import Icon from '../Icon/Icon';

const BADGES: Record<SigningType, (size?: number) => ReactNode> = {
  [SigningType.WATCH_ONLY]: (size?: number) => <Icon as="img" name="watchOnlyBg" size={size} />,
  [SigningType.PARITY_SIGNER]: (size?: number) => <Icon as="img" name="paritySignerBg" size={size} />,
  [SigningType.MULTISIG]: (size?: number) => <Icon as="img" name="multisignature" size={size} />,
};

type Props = {
  theme?: IconTheme;
  signType?: SigningType;
  address?: string;
  size?: number;
  background?: boolean;
  canCopy?: boolean;
  className?: string;
};

const Identicon = ({
  theme = 'polkadot',
  address,
  size = 24,
  signType,
  background = true,
  canCopy = true,
  className,
}: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    wrapperRef.current.querySelector('circle')?.setAttribute('fill', 'none');
  }, []);

  const onCopyToClipboard = async () => {
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
    <Icon name="emptyIdenticon" size={size} />
  );

  const content =
    signType !== undefined ? (
      <>
        {icon}
        <div className="absolute bottom-0 right-0 pointer-events-none">{BADGES[signType](size * 0.58)}</div>
      </>
    ) : (
      icon
    );

  if (!canCopy || !address) {
    return (
      <div
        ref={wrapperRef}
        className={cn('relative flex justify-center items-center', background && 'bg-white rounded-full', className)}
        style={{ width: size, height: size }}
        data-testid={`identicon-${address}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={className}>
      <button
        type="button"
        className={cn('relative flex justify-center items-center cursor-copy', background && 'bg-white rounded-full')}
        style={{ width: size, height: size }}
        data-testid={`identicon-${address}`}
        onClick={onCopyToClipboard}
      >
        {content}
      </button>
    </div>
  );
};

export default memo(Identicon);
