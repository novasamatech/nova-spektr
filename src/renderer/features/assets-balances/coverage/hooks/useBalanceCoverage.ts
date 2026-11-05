import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { CHAIN_ANSWER_DEADLINE_MS } from '@/shared/lib/utils';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { getEntryAccounts } from '@/aggregates/account-presets';
import {
  type ChainStates,
  type RequestedChains,
  getAwaitedChains,
  getBalanceCoverage,
  getChainStates,
  getRequestedChains,
} from '../lib/balanceCoverage';

/**
 * Upper bound on waiting for a selection's balances.
 *
 * A chain whose RPC is down keeps retrying for the life of the app, so an
 * account that lives only there never gets a record. Waiting is bounded rather
 * than open-ended; after this the view renders what it has and says it is
 * incomplete. Matches the deadline the vesting aggregate gives chains.
 */
export const BALANCE_COVERAGE_TIMEOUT_MS = CHAIN_ANSWER_DEADLINE_MS;

/** What a view of the selection's balances shows. */
export type BalanceCoverageState = {
  /**
   * The view may leave its loading skeleton: every selected account has a
   * record on every connected chain it is requested on, or the wait ran out.
   * Once set it stays set for as long as the selection does — a chain that
   * connects later shows as `syncing`, it does not bring the skeleton back.
   */
  ready: boolean;
  /**
   * More balances are on their way — "Syncing balances...": a chain of the
   * selection is connecting, or a connected one has not answered for some
   * account and its wait has not run out.
   */
  syncing: boolean;
  /**
   * How many selected accounts still miss a record on some connected chain
   * after the wait for the current set of connected chains ran out — "Balances
   * of N accounts have not loaded yet". Zero while that wait is running.
   */
  missingCount: number;
};

type Coverage = { complete: boolean; awaitingCount: number };

const isSameCoverage = (next: Coverage, current: Coverage) => {
  return next.complete === current.complete && next.awaitingCount === current.awaitingCount;
};

const isSameChainStates = (next: ChainStates, current: ChainStates) => {
  return next.connecting === current.connecting && next.connected.join(',') === current.connected.join(',');
};

/**
 * Whether the balances of an account selection have arrived — for every
 * account on every connected chain, not just the first one to answer. See
 * {@link getBalanceCoverage}.
 *
 * The accounts awaited are the ones the dashboard requests: every visible
 * wallet account of a selected key (`getEntryAccounts`), and a contact by its
 * address scheme.
 *
 * The wait is keyed by the selection and the connected chains it is requested
 * on: whenever that set changes — a chain connects, or drops — the wait starts
 * again, so a chain that has only just been asked shows as syncing, not as
 * missing.
 */
export const useBalanceCoverage = (accountIds: string[]): BalanceCoverageState => {
  const availableAccounts = useUnit(walletModel.$availableAccounts);
  const chains = useUnit(networkModel.$chainsList);
  const connections = useUnit(networkModel.$connections);

  const entryAccounts = useMemo(() => getEntryAccounts(accountIds, availableAccounts), [accountIds, availableAccounts]);

  // The accounts × chains availability product: rebuilt only when the
  // selection, the accounts or the chain configuration change.
  const requestedChains = useMemo(
    () => getRequestedChains(accountIds, entryAccounts, chains, connections),
    [accountIds, entryAccounts, chains, connections],
  );

  // Statuses flip often, across every chain; only the status of a requested
  // chain matters here, so any other flip does not re-render the view.
  const chainStates = useStoreMap({
    store: networkModel.$connectionStatuses,
    keys: [requestedChains],
    fn: (statuses, [requested]: [RequestedChains]) => getChainStates(requested, statuses),
    updateFilter: (next, current) => !isSameChainStates(next, current),
  });

  // `chainStates` keeps its identity across status flips that leave it equal
  // (see `updateFilter`), so the pairs are rebuilt only when they change.
  const awaitedChains = useMemo(
    () => getAwaitedChains(requestedChains, chainStates.connected),
    [requestedChains, chainStates.connected],
  );

  // The balance map changes on every balance update; only the small answer is
  // kept, so the view re-renders when coverage changes, not when a balance does.
  const { complete, awaitingCount } = useStoreMap({
    store: balanceModel.$balanceMap,
    keys: [accountIds, awaitedChains],
    fn: (balanceMap): Coverage => {
      const coverage = getBalanceCoverage(Object.values(balanceMap), accountIds, awaitedChains);

      return { complete: coverage.complete, awaitingCount: coverage.awaiting.length };
    },
    updateFilter: (next, current) => !isSameCoverage(next, current),
  });

  // Both pieces of state hold the key they were given for, never a bare flag:
  // a key left over from an earlier selection, or from a timer of an earlier
  // wait, simply does not match the current one.
  const selectionKey = accountIds.join(',');
  const waitKey = `${selectionKey}|${chainStates.connected.join(',')}`;
  const [timedOutKey, setTimedOutKey] = useState<string | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);

  const timedOut = timedOutKey === waitKey;

  useEffect(() => {
    const id = setTimeout(() => setTimedOutKey(waitKey), BALANCE_COVERAGE_TIMEOUT_MS);

    return () => {
      clearTimeout(id);
      // A wait that ended is over for good: coming back to the same selection
      // and chains later is a new question with a new wait.
      setTimedOutKey(null);
    };
  }, [waitKey]);

  useEffect(() => {
    // Leaving a selection forgets that it was shown, so coming back to it is a
    // new question too.
    return () => setSettledKey(null);
  }, [selectionKey]);

  const answered = complete || timedOut;
  if (answered && settledKey !== selectionKey) {
    setSettledKey(selectionKey);
  }

  return {
    ready: answered || settledKey === selectionKey,
    syncing: chainStates.connecting || (!complete && !timedOut),
    missingCount: timedOut ? awaitingCount : 0,
  };
};
