import { Identicon as PolkadotIdenticon } from '@polkadot/react-identicon';
import { IconTheme } from '@polkadot/react-identicon/types';
import cn from 'classnames';
import { useLayoutEffect, useRef } from 'react';

import { copyToClipboard } from '@renderer/utils/strings';

type Props = {
  theme?: IconTheme;
  address: string;
  size?: number;
  background?: boolean;
  canCopy?: boolean;
};

const Identicon = ({ theme = 'polkadot', address, size = 24, background = true, canCopy = true }: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    wrapperRef.current.querySelector('circle')?.setAttribute('fill', 'none');
  }, []);

  const onCopyToClipboard = async () => {
    await copyToClipboard(address);
  };

  const icon = (
    <PolkadotIdenticon
      theme={theme}
      value={address}
      size={background ? size * 0.75 : size}
      className="pointer-events-none"
    />
  );

  if (!canCopy) {
    return (
      <div
        ref={wrapperRef}
        className={cn('flex justify-center items-center rounded-full', background && 'bg-white')}
        style={{ width: size, height: size }}
        data-testid={`identicon-${address}`}
      >
        {icon}
      </div>
    );
  }

  return (
    <div ref={wrapperRef}>
      <button
        type="button"
        className={cn('flex justify-center items-center rounded-full cursor-copy', background && 'bg-white')}
        style={{ width: size, height: size }}
        data-testid={`identicon-${address}`}
        onClick={onCopyToClipboard}
      >
        {icon}
      </button>
    </div>
  );
};

export default Identicon;
