import { Identicon as PolkadotIdenticon } from '@polkadot/react-identicon';
import { IconTheme } from '@polkadot/react-identicon/types';
import { useLayoutEffect, useRef } from 'react';

type Props = {
  theme?: IconTheme;
  address: string;
  size: number;
};

const Identicon = ({ theme = 'polkadot', address, size }: Props) => {
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
      className={`flex justify-center items-center bg-white rounded-full cursor-copy`}
      style={{ width: size, height: size }}
      data-testid={`identicon-${address}`}
      onClick={onCopyToClipboard}
    >
      <PolkadotIdenticon theme={theme} value={address} size={size * 0.75} className="pointer-events-none" />
    </button>
  );
};

export default Identicon;
