import { useUnit } from 'effector-react';
import { useEffect, useMemo } from 'react';

import { toAccountId } from '@/shared/lib/utils';
import { stakingPositions } from '@/aggregates/staking-positions';

/**
 * Hands the dashboard's account selection to the positions aggregate.
 *
 * The aggregate answers for exactly the ids it is given - never for the wallet
 * selected in wallet management. The selection spans every wallet of the
 * installation plus the address book, and every staking widget of the tab reads
 * the resulting `$positions`, so this is the only place the tab pushes ids into
 * the aggregate: the KPI and rewards widgets are injected into the same slot
 * behind the same feature flag and mount together with this one.
 *
 * The set is replaced wholesale on every change and released on unmount, so the
 * ledger and nominations subscriptions it costs (one per staking chain) stay
 * bounded by what the user is actually looking at.
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
