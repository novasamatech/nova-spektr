import { type IconTheme } from '@polkadot/react-identicon/types';

import { type Address, type WalletIconType, type WalletType } from '@/shared/core';
import { Identicon } from '@/shared/ui';
import { WalletIcon } from '@/entities/wallet';

type Props = {
  address: Address | undefined;
  size?: number;
  type: WalletType | WalletIconType;
  theme?: IconTheme;
};

export const WalletAccountIcon = ({ address, size = 32, type, theme = 'polkadot' }: Props) => {
  return (
    <div className="relative">
      <Identicon address={address} size={size} background={false} theme={theme} />
      <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-white">
        <WalletIcon type={type} size={size / 2} />
      </div>
    </div>
  );
};
