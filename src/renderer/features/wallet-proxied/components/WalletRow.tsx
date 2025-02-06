import { useStoreMap, useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { WalletManagement } from '@/shared/ui-entities';
import { accounts as accountsDomainModel, accountsService } from '@/domains/network';
import { ChainIcon } from '@/entities/chain';
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
    store: accountsDomainModel.$list,
    keys: [wallet.id],
    fn: (accounts, [walletId]) => {
      const match = accountsService.filterAccountsByWallet(accounts, walletId).at(0);

      return match && accountsService.isChainAccount(match) ? match : null;
    },
  });

  return (
    <WalletManagement
      wallet={wallet}
      meta={account ? <ChainIcon src={chains[account.chainId].icon} size={16} /> : null}
      description={<WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />}
      onClick={() => onSelect(wallet)}
    >
      <Slot id={walletActionsSlot} props={{ wallet }} />
    </WalletManagement>
  );
};
