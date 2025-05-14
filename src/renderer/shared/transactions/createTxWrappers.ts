import { type Store, combine, createStore } from 'effector';

import { type Chain, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { transactionService } from '@/entities/transaction';
import { walletUtils } from '@/entities/wallet';

type Params = {
  active?: Store<boolean>;
  chain: Store<Chain | null>;
  wallet: Store<Wallet | null>;
  wallets: Store<Wallet[]>;
  initiator: Store<AnyAccount | null>;
  signatory: Store<AnyAccount | null>;
};

/**
 * @deprecated Tx wrappers are still used in basket operations
 */
export const createTxWrappers = ({
  active = createStore(true),
  chain,
  wallet,
  wallets,
  initiator,
  signatory,
}: Params) => {
  return combine(
    {
      active,
      wallet,
      wallets,
      chain,
      initiator,
      signatory,
    },
    ({ active, wallet, initiator, wallets, signatory, chain }) => {
      if (!active) return [];
      if (nullable(wallet) || nullable(chain) || nullable(initiator)) return [];

      const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
        walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      });

      return transactionService.getTxWrappers({
        wallet,
        wallets: filteredWallets || [],
        account: initiator,
        signatories: signatory ? [signatory] : [initiator],
      });
    },
  );
};
