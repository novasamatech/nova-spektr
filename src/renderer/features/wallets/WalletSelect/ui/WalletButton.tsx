import { Popover } from '@headlessui/react';

import type { Wallet } from '@shared/core';
import { WalletFiatBalance } from './WalletFiatBalance';
import { Icon, BodyText } from '@shared/ui';
import { WalletIcon } from '@entities/wallet';
import { WalletStatus } from './WalletStatus';

type Props = {
  wallet: Wallet;
};
export const WalletButton = ({ wallet }: Props) => {
  return (
    <Popover.Button className="border border-container-border bg-left-navigation-menu-background rounded-md w-full shadow-card-shadow">
      <div className="flex items-center gap-x-2 px-3 py-2 relative">
        <WalletIcon className="shrink-0" type={wallet.type} size={32} />

        <WalletStatus wallet={wallet} className="absolute bottom-3 left-9" />

        <div className="flex flex-col gap-y-1 overflow-hidden">
          <BodyText className="truncate">{wallet.name}</BodyText>
          <WalletFiatBalance walletId={wallet.id} className="truncate" />
        </div>

        <Icon name="down" size={16} className="ml-auto shrink-0" />
      </div>
    </Popover.Button>
  );
};
