import { useStoreMap, useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { cnTw } from '@/shared/lib/utils';
import { WalletManagement } from '@/shared/ui-entities';
import { accountService, accounts as accountsDomainModel } from '@/domains/network';
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
      const walletAccounts = accountService.filterAccountsByWallet(wcAccounts, walletId);

      return walletConnectService.areAccountsConnected(sessions, walletAccounts);
    },
  });

  // ToDo: use utils
  const polkadotAccount =
    wallet.accounts.find(
      account => account.chainId === '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    ) || wallet.accounts[0];

  return (
    <WalletManagement
      wallet={wallet}
      accountId={polkadotAccount.accountId}
      meta={<span className={cnTw('h-1.5 w-1.5 rounded-full', connected ? 'bg-icon-positive' : 'bg-icon-default')} />}
      description={<WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />}
      onClick={() => onSelect(wallet)}
    >
      <Slot id={walletActionsSlot} props={{ wallet }} />
    </WalletManagement>
  );
};
