import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountService, accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';

/**
 * The wallet that owns `accountId` on `chain`, picked by the same rule the
 * search resolvers use (`findRelatedAccount`: chain-aware, custom-named
 * candidate first) so what a row displays and what a query matches never
 * disagree. `null` when the account is not in any local wallet.
 *
 * Pass `accountId: null` to opt out: the lookup scans every local account, and
 * `<NamedAccount>` renders in long lists, so it must only run where the result
 * is used.
 */
export const useOwningWallet = (accountId: AccountId | null, chain: Chain | null | undefined): Wallet | null => {
  const allAccounts = useUnit(accounts.$list);
  const wallets = useUnit(walletModel.$wallets);

  const account = useMemo(
    () => (accountId ? accountService.findRelatedAccount(allAccounts, accountId, chain) : undefined),
    [allAccounts, accountId, chain],
  );

  return useMemo(() => {
    if (!account) return null;

    return wallets.find((wallet) => wallet.id === account.walletId) ?? null;
  }, [wallets, account]);
};
