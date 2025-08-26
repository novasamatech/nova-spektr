import { useStoreMap, useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { cnTw, isPolkadotChain } from '@/shared/lib/utils';
import { WalletManagement } from '@/shared/ui-entities';
import { accountService, accounts as accountsDomainModel } from '@/domains/network';
import { walletSelect } from '@/aggregates/wallet-select';
import { WalletFiatBalance } from '@/features/wallet-fiat-balance';
import { walletConnectService } from '../lib/service';
import { walletConnect } from '../model/connect';

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  wallet: Wallet;
  onSelect: (wallet: Wallet) => unknown;
};
export const WalletRow = ({ wallet, onSelect }: Props) => {
  const sessions = useUnit(walletConnect.$sessions);
  const selectedWalletId = useUnit(walletSelect.$selectedWalletId);

  const connected = useStoreMap({
    store: accountsDomainModel.$list,
    keys: [wallet.id, sessions],
    fn: (accounts, [walletId, sessions]) => {
      const wcAccounts = accounts.filter(walletConnectService.isWalletConnectAccount);
      const walletAccounts = accountService.filterAccountsByWallet(wcAccounts, walletId);

      return walletConnectService.areAccountsConnected(sessions, walletAccounts);
    },
  });

  const accountId = useMemo(() => {
    const mainAccount = wallet.accounts.find(account => isPolkadotChain(account.chainId)) || wallet.accounts[0];
    return mainAccount?.accountId ?? null;
  }, [wallet]);

  return (
    <WalletManagement
      wallet={wallet}
      active={selectedWalletId === wallet.id}
      accountId={accountId}
      meta={<span className={cnTw('h-1.5 w-1.5 rounded-full', connected ? 'bg-icon-positive' : 'bg-icon-default')} />}
      description={<WalletFiatBalance wallet={wallet} className="max-w-[215px] truncate text-help-text" />}
      onClick={() => onSelect(wallet)}
    >
      <Slot id={walletActionsSlot} props={{ wallet }} />
    </WalletManagement>
  );
};
