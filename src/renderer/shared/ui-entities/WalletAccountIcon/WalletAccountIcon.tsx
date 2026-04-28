import { useDeferredValue } from 'react';

import { type Address, type WalletType } from '@/shared/core';
import { type IdenticonIconTheme, Identicon } from '../Identicon/Identicon';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = {
  address: Address | undefined;
  size?: number;
  iconSize?: number;
  type: WalletType | null;
  theme?: IdenticonIconTheme;
};

export const WalletAccountIcon = ({ address, size = 32, iconSize = 16, type, theme }: Props) => {
  const deferredAddress = useDeferredValue(address, null);

  return (
    <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
      <Identicon address={deferredAddress || null} size={size} background={false} theme={theme} />
      {type !== null && (
        <div className="pointer-events-none absolute -right-1 -bottom-1 rounded-full border-2 border-white bg-white">
          <WalletIcon type={type} size={iconSize} />
        </div>
      )}
    </div>
  );
};
