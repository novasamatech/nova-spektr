import { type Address, type WalletType } from '@/shared/core';
import { WalletIcon } from '@/entities/wallet';
import { Identicon, type IdenticonIconTheme } from '../Identicon/Identicon';

type Props = {
  address: Address | undefined;
  size?: number;
  iconSize?: number;
  type: WalletType;
  theme?: IdenticonIconTheme;
};

export const WalletAccountIcon = ({ address, size = 32, iconSize = 16, type, theme = 'polkadot' }: Props) => {
  return (
    <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
      <Identicon canCopy={false} address={address ?? ''} size={size} background={false} theme={theme} />
      <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-white">
        <WalletIcon type={type} size={iconSize} />
      </div>
    </div>
  );
};
