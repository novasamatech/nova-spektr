import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { isSignerAccount } from '@/features/signing-path';

/**
 * Whether this installation can sign _anything_ on the given chain.
 *
 * A payout is permissionless — it names the validator, and the reward reaches
 * each nominator's own payee whoever submits it — so what gates the drawer's
 * Claim chip is not "do we hold this position's account" but "can we sign on
 * this network at all". An address-book position on a chain where we hold a
 * signer is claimable; deliberately independent of the position's own account.
 *
 * Which accounts count is `isSignerAccount`'s call and nothing else's — the
 * same predicate the signing-path graph terminates at, so the chip never
 * refuses a claim the flow behind it would have completed.
 */
export const useChainHasSigner = (chain: Chain | null): boolean => {
  const allAccounts = useUnit(accounts.$list);

  return useMemo(() => {
    if (nullable(chain)) return false;

    return allAccounts.some(
      (account) => isSignerAccount(account) && accountService.isAccountAvailableOnChain(account, chain),
    );
  }, [allAccounts, chain]);
};
