import { type Address, type WalletType } from '@/shared/core';
import { type IdenticonIconTheme, Identicon } from '../Identicon/Identicon';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = {
  address: Address | undefined;
  size?: number;
  iconSize?: number;
  type: WalletType;
  theme?: IdenticonIconTheme;
};

export const WalletAccountIcon = ({ address, size = 32, iconSize = 16, type, theme }: Props) => {
  return (
    <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
      {<Identicon address={address || null} size={size} background={false} theme={theme} />}
      <div className="pointer-events-none absolute -right-1 -bottom-1 rounded-full border-2 border-white bg-white">
        <WalletIcon type={type} size={iconSize} />
      </div>
    </div>
  );
};
