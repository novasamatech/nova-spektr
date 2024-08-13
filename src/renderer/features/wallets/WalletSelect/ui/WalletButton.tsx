import { Popover } from '@headlessui/react';

import { type Wallet } from '@shared/core';
import { Icon } from '@shared/ui';
import { WalletCardLg } from '@entities/wallet';

import { WalletFiatBalance } from './WalletFiatBalance';

type Props = {
  wallet: Wallet;
};
export const WalletButton = ({ wallet }: Props) => {
  return (
    <Popover.Button className="w-full rounded-md border border-container-border bg-left-navigation-menu-background shadow-card-shadow">
      <div className="flex items-center justify-between px-3 py-3">
        <WalletCardLg wallet={wallet} description={<WalletFiatBalance walletId={wallet.id} className="truncate" />} />
        <Icon name="down" size={16} className="ml-auto shrink-0" />
      </div>
    </Popover.Button>
  );
};
