import { useUnit } from 'effector-react';

import { walletModel, walletUtils } from '@entities/wallet';
import { walletConnectUtils, walletConnectModel } from '@entities/walletConnect';
import { Wallet } from '@shared/core';
import { cnTw } from '@shared/lib/utils';

type Props = {
  wallet: Wallet;
  className?: string;
};

export const WalletStatus = ({ wallet, className }: Props) => {
  const accounts = useUnit(walletModel.$accounts);
  const client = useUnit(walletConnectModel.$client);

  const isWalletConnect = walletUtils.isWalletConnectFamily(wallet);
  const account = accounts.find((a) => a.walletId === wallet.id);

  if (!isWalletConnect || !client || !account) {
    return <></>;
  }

  const isConnected = walletConnectUtils.isConnected(account.signingExtras?.sessionTopic, client);

  return (
    <div
      className={cnTw(
        'h-1.5 w-1.5 box-content rounded-full border-white border-2',
        isConnected ? 'bg-icon-positive' : 'bg-icon-default',
        className,
      )}
    ></div>
  );
};
