import { type Address, type WalletIconType, type WalletType } from '@/shared/core';
import { Identicon, type IconTheme as IdenticonIconTheme } from '@/shared/ui';
import { WalletIcon } from '@/entities/wallet';

export type IconTheme = IdenticonIconTheme;

type Props = {
  address: Address | undefined;
  size?: number;
  type: WalletType | WalletIconType;
  theme?: IconTheme;
};

export const WalletAccountIcon = ({ address, size = 32, type, theme = 'polkadot' }: Props) => {
  return (
    <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
      <Identicon canCopy={false} address={address} size={size} background={false} theme={theme} />
      <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-white">
        <WalletIcon type={type} size={size / 2} />
      </div>
    </div>
  );
};
