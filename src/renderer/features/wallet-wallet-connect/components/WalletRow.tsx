import { useStoreMap, useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { cnTw } from '@/shared/lib/utils';
import { WalletManagement } from '@/shared/ui-entities';
import { accounts as accountsDomainModel, accountsService } from '@/domains/network';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';
import { walletConnectService } from '../lib/service';
import { walletConnect } from '../model/connect';

const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  wallet: Wallet;
  onSelect: (wallet: Wallet) => unknown;
};
export const WalletRow = ({ wallet, onSelect }: Props) => {
  const sessions = useUnit(walletConnect.$sessions);

  const connected = useStoreMap({
    store: accountsDomainModel.$list,
    keys: [wallet.id, sessions],
    fn: (accounts, [walletId, sessions]) => {
      const wcAccounts = accounts.filter(walletConnectService.isWalletConnectAccount);
      const walletAccounts = accountsService.filterAccountsByWallet(wcAccounts, walletId);

      return walletConnectService.areAccountsConnected(sessions, walletAccounts);
    },
  });

  return (
    <WalletManagement
      wallet={wallet}
      meta={<span className={cnTw('h-1.5 w-1.5 rounded-full', connected ? 'bg-icon-positive' : 'bg-icon-default')} />}
      description={<WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />}
      onClick={() => onSelect(wallet)}
    >
      <Slot id={walletActionsSlot} props={{ wallet }} />
    </WalletManagement>
  );
};
