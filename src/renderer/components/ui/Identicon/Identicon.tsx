import { Identicon as PolkadotIdenticon } from '@polkadot/react-identicon';
import { IconTheme } from '@polkadot/react-identicon/types';
import { ReactNode, useLayoutEffect, useRef, memo, SyntheticEvent } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { SigningType, Address } from '@renderer/domain/shared-kernel';
import { copyToClipboard } from '@renderer/shared/utils/strings';
import Icon from '../Icon/Icon';

const Badges: Record<SigningType, (size?: number) => ReactNode> = {
  [SigningType.WATCH_ONLY]: (size?: number) => <Icon as="img" name="watchOnlyBg" size={size} />,
  [SigningType.PARITY_SIGNER]: (size?: number) => <Icon as="img" name="paritySignerBg" size={size} />,
  [SigningType.MULTISIG]: (size?: number) => <Icon as="img" name="multisigBg" size={size} />,
};

type Props = {
  theme?: IconTheme;
  signType?: SigningType;
  address?: Address;
  size?: number;
  background?: boolean;
  canCopy?: boolean;
  className?: string;
  buttonClassName?: string;
};

const Identicon = ({
  theme = 'polkadot',
  address,
  size = 24,
  signType,
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
    <Icon name="emptyIdenticon" size={size} />
  );

  const content =
    signType === undefined ? (
      icon
    ) : (
      <>
        {icon}
        <div className="absolute bottom-0 right-0 pointer-events-none">{Badges[signType](size * 0.58)}</div>
      </>
    );

  if (!canCopy || !address) {
    return (
      <div
        ref={wrapperRef}
        className={cnTw('relative flex justify-center items-center', background && 'bg-white rounded-full', className)}
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
        className={cnTw(
          'relative flex justify-center items-center cursor-copy',
          background && 'bg-white rounded-full',
          buttonClassName,
        )}
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
