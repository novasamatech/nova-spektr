import { Popover } from '@headlessui/react';

import type { Wallet_NEW } from '@shared/core';
import { WalletFiatBalance } from './WalletFiatBalance';
import { Icon } from '@shared/ui';
import { WalletCardLg } from '@entities/wallet';

type Props = {
  wallet: Wallet_NEW;
};
export const WalletButton = ({ wallet }: Props) => {
  return (
    <Popover.Button className="border border-container-border bg-left-navigation-menu-background rounded-md w-full shadow-card-shadow">
      <div className="flex items-center justify-between px-3 py-3">
        <WalletCardLg wallet={wallet} description={<WalletFiatBalance walletId={wallet.id} className="truncate" />} />
        <Icon name="down" size={16} className="ml-auto shrink-0" />
      </div>
    </Popover.Button>
  );
};
