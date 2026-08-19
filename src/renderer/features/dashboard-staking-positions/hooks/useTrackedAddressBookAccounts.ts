import { useUnit } from 'effector-react';
import { useEffect, useMemo } from 'react';

import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { stakingPositions } from '@/aggregates/staking-positions';

/**
 * Teaches the positions aggregate about the address-book rows of the dashboard
 * selection.
 *
 * The aggregate derives positions from the selected wallet's accounts; an
 * address that exists only in the address book has no account object, so it
 * would never produce a row. Handing those ids over is what makes an
 * address-book position visible — and what keeps the `draft` access mode
 * reachable, since no local account backs the row.
 *
 * **This is the only place the dashboard pushes ids into the aggregate.** The
 * KPI and rewards widgets read the very same `$positions`, so they inherit the
 * rows without repeating the wiring — both are injected into the staking slot
 * behind the same feature flag as this widget, so they mount together with it.
 *
 * The tracked set is the current selection, never the address book: it is
 * replaced wholesale on every change and released on unmount, so the ledger and
 * nominations subscriptions it costs (one per staking chain) stay bounded by
 * what the user is actually looking at.
 */
export const useTrackedAddressBookAccounts = (accountIds: string[]) => {
  const allAccounts = useUnit(accounts.$list);
  const trackAccountIds = useUnit(stakingPositions.trackAccountIds);

  const trackedAccountIds = useMemo(() => {
    const localAccountIds = new Set(allAccounts.map((account) => account.accountId));
    const tracked: AccountId[] = [];

    for (const id of accountIds) {
      const accountId = toAccountId(id);
      // A wallet account is already covered, and covered with the chain
      // availability check the aggregate can only run on a real account.
      if (localAccountIds.has(accountId)) continue;

      tracked.push(accountId);
    }

    return tracked;
  }, [accountIds, allAccounts]);

  useEffect(() => {
    trackAccountIds(trackedAccountIds);
  }, [trackedAccountIds, trackAccountIds]);

  useEffect(() => {
    return () => {
      trackAccountIds([]);
    };
  }, [trackAccountIds]);
};
