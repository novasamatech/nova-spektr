import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { CHAIN_ANSWER_DEADLINE_MS } from '@/shared/lib/utils';
import { accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { getAccountsWithChains, getBalanceCoverage } from '../lib/balanceCoverage';

/**
 * Upper bound on waiting for a selection's balances.
 *
 * A chain whose RPC is down keeps retrying for the life of the app, so an
 * account that lives only there never gets a record. Waiting is bounded rather
 * than open-ended; after this the view renders what it has and says it is
 * incomplete. Matches the deadline the vesting aggregate gives chains.
 */
export const BALANCE_COVERAGE_TIMEOUT_MS = CHAIN_ANSWER_DEADLINE_MS;

export type BalanceCoverageState = {
  /** Every selected account that can hold balances has at least one record. */
  complete: boolean;
  /** How many selected accounts still have no record. */
  awaitingCount: number;
  /**
   * The wait for this selection has run past {@link BALANCE_COVERAGE_TIMEOUT_MS}.
   * Re-armed whenever the selection changes.
   */
  timedOut: boolean;
};

type Coverage = Pick<BalanceCoverageState, 'complete' | 'awaitingCount'>;

const isSameCoverage = (next: Coverage, current: Coverage) => {
  return next.complete === current.complete && next.awaitingCount === current.awaitingCount;
};

/**
 * Whether the balances of an account selection have arrived — for every
 * account, not just the first one to answer. See {@link getBalanceCoverage}.
 */
export const useBalanceCoverage = (accountIds: string[]): BalanceCoverageState => {
  const allAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chainsList);
  const connections = useUnit(networkModel.$connections);

  const accountsWithChains = useMemo(
    () => getAccountsWithChains(accountIds, allAccounts, chains, connections),
    [accountIds, allAccounts, chains, connections],
  );

  // The balance map changes on every balance update; only the small answer is
  // kept, so the view re-renders when coverage changes, not when a balance does.
  const { complete, awaitingCount } = useStoreMap({
    store: balanceModel.$balanceMap,
    keys: [accountIds, accountsWithChains],
    fn: (balanceMap): Coverage => {
      const coverage = getBalanceCoverage(Object.values(balanceMap), accountIds, accountsWithChains);

      return { complete: coverage.complete, awaitingCount: coverage.awaiting.length };
    },
    updateFilter: (next, current) => !isSameCoverage(next, current),
  });

  // Re-armed per selection: a new selection is a new question, and its
  // balances may not be in the store yet even though the previous one's were.
  const accountKey = accountIds.join(',');
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimedOut(false);
    const id = setTimeout(() => setTimedOut(true), BALANCE_COVERAGE_TIMEOUT_MS);

    return () => clearTimeout(id);
  }, [accountKey]);

  return { complete, awaitingCount, timedOut };
};
