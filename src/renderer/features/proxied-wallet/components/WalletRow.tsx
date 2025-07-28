import { useStoreMap, useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { isEthereumAccountId } from '@/shared/lib/utils';
import { type IconTheme, WalletManagement } from '@/shared/ui-entities';
import { ChainIcon } from '@/shared/ui-entities';
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
      const match = accountService.filterAccountsByWallet(accounts, walletId).at(0);
      return match && accountService.isChainAccount(match) ? match : null;
    },
  });

  const chain = account ? chains[account.chainId] : null;

  const address = wallet.accounts[0]?.accountId;
  const isEthereum = isEthereumAccountId(address);
  const theme: IconTheme = isEthereum ? 'ethereum' : 'polkadot';

  return (
    <WalletManagement
      wallet={wallet}
      address={address}
      theme={theme}
      meta={chain ? <ChainIcon chain={chain} size={16} /> : null}
      description={<WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />}
      onClick={() => onSelect(wallet)}
    >
      <Slot id={walletActionsSlot} props={{ wallet }} />
    </WalletManagement>
  );
};
