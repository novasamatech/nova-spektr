import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { walletModel } from '@/entities/wallet';

/**
 * Owning wallet of every local account, keyed by account id.
 *
 * The hover card resolves names through `NamedAccount`, which only runs the
 * full resolution chain when it is handed the wallet the account belongs to.
 * Reward records arrive as bare addresses, so the wallet has to be looked back
 * up here; addresses that belong to no local wallet (a contact that stakes)
 * simply resolve without one.
 */
export const useWalletByAccountId = (): Map<AccountId, Wallet> => {
  const wallets = useUnit(walletModel.$wallets);

  return useMemo(() => {
    const map = new Map<AccountId, Wallet>();

    for (const wallet of wallets) {
      for (const account of wallet.accounts) {
        if (!map.has(account.accountId)) {
          map.set(account.accountId, wallet);
        }
      }
    }

    return map;
  }, [wallets]);
};
