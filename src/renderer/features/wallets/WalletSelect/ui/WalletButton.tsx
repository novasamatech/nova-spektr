import { Popover } from '@headlessui/react';

import type { Wallet } from '@renderer/shared/core';
import { WalletFiatBalance } from './WalletFiatBalance';
import { Icon, BodyText } from '@renderer/shared/ui';
import { WalletIcon } from '@renderer/entities/wallet';

type Props = {
  wallet: Wallet;
};
export const WalletButton = ({ wallet }: Props) => {
  return (
    <Popover.Button className="border border-container-border bg-left-navigation-menu-background rounded-md w-full shadow-card-shadow">
      <div className="flex items-center gap-x-2 px-3 py-2">
        <WalletIcon className="shrink-0" type={wallet.type} size={32} />

        <div className="flex flex-col gap-y-1 overflow-hidden">
          <BodyText className="truncate">{wallet.name}</BodyText>
          <WalletFiatBalance walletId={wallet.id} className="truncate" />
        </div>

        <Icon name="down" size={16} className="ml-auto shrink-0" />
      </div>
    </Popover.Button>
  );
};
