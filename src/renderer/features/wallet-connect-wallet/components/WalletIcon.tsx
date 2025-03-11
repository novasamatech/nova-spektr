import { useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { WalletIcon as Icon } from '@/entities/wallet';
import { walletConnectService } from '../lib/service';
import { walletConnect } from '../model/connect';

type Props = {
  wallet: Wallet;
  size: number;
};

export const WalletIcon = ({ wallet, size }: Props) => {
  const sessions = useUnit(walletConnect.$sessions);
  const connected = walletConnectService.areAccountsConnected(sessions, wallet.accounts);

  return (
    <div className="relative h-fit w-fit">
      <Icon type={wallet.type} size={size} />
      <span
        className={cnTw(
          'absolute -bottom-0.5 -right-0.5 box-content h-1.5 w-1.5 rounded-full border-2 border-white',
          connected ? 'bg-icon-positive' : 'bg-icon-default',
        )}
      />
    </div>
  );
};
