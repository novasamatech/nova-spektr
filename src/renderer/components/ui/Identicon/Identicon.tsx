import { Identicon as PolkadotIdenticon } from '@polkadot/react-identicon';
import { IconTheme } from '@polkadot/react-identicon/types';
import cn from 'classnames';
import { useLayoutEffect, useRef } from 'react';

type Props = {
  theme?: IconTheme;
  address: string;
  size?: number;
  background?: boolean;
};

const Identicon = ({ theme = 'polkadot', address, size = 24, background = true }: Props) => {
  const wrapperRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    wrapperRef.current.querySelector('circle')?.setAttribute('fill', 'none');
  }, []);

  const onCopyToClipboard = () => {
    navigator.clipboard.writeText(address);
  };

  return (
    <button
      type="button"
      ref={wrapperRef}
      className={cn(`flex justify-center items-center rounded-full cursor-copy`, background && 'bg-white')}
      style={{ width: size, height: size }}
      data-testid={`identicon-${address}`}
      onClick={onCopyToClipboard}
    >
      <PolkadotIdenticon
        theme={theme}
        value={address}
        size={background ? size * 0.75 : size}
        className="pointer-events-none"
      />
    </button>
  );
};

export default Identicon;
