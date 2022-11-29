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
  noCopy?: boolean;
};

const Identicon = ({ theme = 'polkadot', address, size = 24, background = true, noCopy }: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    wrapperRef.current.querySelector('circle')?.setAttribute('fill', 'none');
  }, []);

  const onCopyToClipboard = async () => {
    await copyToClipboard(address);
  };

  const icon = (
    <div ref={wrapperRef} className="h-full">
      <PolkadotIdenticon
        theme={theme}
        value={address}
        size={background ? size * 0.75 : size}
        className="pointer-events-none"
      />
    </div>
  );

  if (noCopy) {
    return (
      <div
        className={cn(`flex justify-center items-center rounded-full cursor-copy`, background && 'bg-white')}
        style={{ width: size, height: size }}
        data-testid={`identicon-${address}`}
      >
        {icon}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(`flex justify-center items-center rounded-full cursor-copy`, background && 'bg-white')}
      style={{ width: size, height: size }}
      data-testid={`identicon-${address}`}
      onClick={onCopyToClipboard}
    >
      {icon}
    </button>
  );
};

export default Identicon;
