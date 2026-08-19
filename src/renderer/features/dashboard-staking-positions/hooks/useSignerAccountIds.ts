import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { collectSignerAccountIds } from '@/features/signing-path';

/**
 * Every account of this installation that can produce a signature, as the set
 * `getAccessMode` expects.
 *
 * Lives next to `getAccessMode` so the two cannot be paired with a different
 * account source by accident: the verdict has to be built from the account
 * domain's list, the same one the signing-path graph and `useChainHasSigner`
 * walk. It is also memoised once per consumer rather than per row — the
 * classify step runs for every position on screen, and rebuilding the set
 * inside it made the work quadratic in the size of the wallet.
 */
export const useSignerAccountIds = (): ReadonlySet<AccountId> => {
  const allAccounts = useUnit(accounts.$list);

  return useMemo(() => collectSignerAccountIds(allAccounts), [allAccounts]);
};
