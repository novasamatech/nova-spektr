import { useUnit } from 'effector-react';
import { useEffect, useMemo } from 'react';

import { toAccountId } from '@/shared/lib/utils';
import { stakingPositions } from '@/aggregates/staking-positions';

/**
 * Hands the dashboard's account selection to the positions aggregate, so the
 * Staked column can show every selected account's ledger `active` amount -
 * whichever wallet it belongs to, and address-book rows included.
 *
 * Replicates (not imports) the staking tab's hook of the same name - the
 * aggregate's store dedupes and sorts via `updateFilter`, so both tabs pushing
 * the same selection does not churn subscriptions.
 *
 * The set is replaced wholesale on every change and released on unmount, so the
 * ledger subscriptions it costs stay bounded by what the user is actually
 * looking at.
 */
export const useStakingAccountSelection = (accountIds: string[]) => {
  const selectAccountIds = useUnit(stakingPositions.selectAccountIds);

  const selectedAccountIds = useMemo(() => accountIds.map((id) => toAccountId(id)), [accountIds]);

  useEffect(() => {
    selectAccountIds(selectedAccountIds);
  }, [selectedAccountIds, selectAccountIds]);

  useEffect(() => {
    return () => {
      selectAccountIds([]);
    };
  }, [selectAccountIds]);
};
