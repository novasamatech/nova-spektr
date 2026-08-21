import { useUnit } from 'effector-react';
import { useEffect, useMemo } from 'react';

import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { stakingPositions } from '@/aggregates/staking-positions';

/**
 * Teaches the positions aggregate about the address-book rows of the dashboard
 * selection, so the Staked column can show their ledger `active` amount.
 *
 * The aggregate derives positions from the selected wallet's accounts; an
 * address that exists only in the address book has no account object, so it
 * would never produce a position without this. Replicates (not imports) the
 * staking tab's `useTrackedAddressBookAccounts` — the store dedupes and sorts
 * via `updateFilter`, so both tabs pushing the same selection does not churn
 * subscriptions.
 *
 * The tracked set is the current selection, replaced wholesale on every change
 * and released on unmount, so the ledger subscriptions it costs stay bounded by
 * what the user is actually looking at.
 */
export const useTrackedContacts = (accountIds: string[]) => {
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
