import { useStoreMap, useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { toAddress } from '@/shared/lib/utils';
import { ChainIcon, WalletManagement } from '@/shared/ui-entities';
import { accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';

const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  wallet: Wallet;
  onSelect: (wallet: Wallet) => unknown;
};
export const WalletRow = ({ wallet, onSelect }: Props) => {
  const chains = useUnit(networkModel.$chains);

  const account = useStoreMap({
    store: accounts.$list,
    keys: [wallet.id],
    fn: (accounts, [walletId]) => {
      return accountService.filterAccountsByWallet(accounts, walletId).at(0);
    },
  });

  const chain = account && accountService.isChainAccount(account) ? chains[account.chainId] : null;

  const accountId = account?.accountId;

  if (!accountId) {
    return null;
  }

  return (
    <WalletManagement
      wallet={wallet}
      address={toAddress(accountId, { prefix: chain?.addressPrefix })}
      meta={chain ? <ChainIcon chain={chain} size={16} /> : null}
      description={<WalletFiatBalance walletId={wallet.id} className="text-help-text max-w-[215px] truncate" />}
      onClick={() => onSelect(wallet)}
    >
      <Slot id={walletActionsSlot} props={{ wallet }} />
    </WalletManagement>
  );
};
