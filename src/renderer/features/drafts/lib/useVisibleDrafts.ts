import { useStoreMap, useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Draft } from '@/domains/backend';
import { type AnyAccount, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { $searchResolvers, searchOperationRows } from '@/aggregates/operations-search';

import { type DraftListScope, buildDraftSearchRow, filterDraftsByScope } from './draft-scope';
import { useReadableDrafts } from './useReadableDrafts';
import { filterVisibleDrafts } from './visible-drafts';

const NO_ACCOUNTS: AnyAccount[] = [];

/**
 * Readable drafts minus the ones already linked to a live operation — exactly
 * the rows the Drafts section renders. `available` mirrors `useReadableDrafts`
 * (backend healthy + draft-read permission). An optional `scope` narrows the
 * list to the Operations view's active non-status filters (see
 * `filterDraftsByScope`), keeping rows and counts consistent with the filtered
 * operations list.
 */
export function useVisibleDrafts(scope?: DraftListScope): { drafts: Draft[]; available: boolean } {
  const { drafts, available } = useReadableDrafts();
  const chains = useUnit(networkModel.$chains);

  const hasQuery = Boolean(scope?.searchQuery.trim());
  // Resolvers change on every contact / identity / account / wallet update.
  // Subscribing unconditionally would re-render consumers that never search,
  // such as the dashboard widget.
  const resolvers = useStoreMap({
    store: $searchResolvers,
    keys: [hasQuery],
    fn: (resolvers) => (hasQuery ? resolvers : null),
  });

  const needsMySignature = Boolean(scope?.needsMySignature);
  // Same idea: the account list is only consulted while the toggle is on.
  const walletAccounts = useStoreMap({
    store: accounts.$list,
    keys: [needsMySignature],
    fn: (allAccounts) => (needsMySignature ? allAccounts : NO_ACCOUNTS),
  });

  const visibleDrafts = useMemo(() => {
    const visible = filterVisibleDrafts(drafts);
    if (!scope) return visible;

    // Resolved over the pre-search list: resolving over the filtered one would
    // shrink the set as the user types, making matches disappear mid-query.
    const searchMatchedIds = resolvers
      ? searchOperationRows(
          visible.map((draft) => buildDraftSearchRow(draft, chains, resolvers.resolveWalletName)),
          scope.searchQuery,
          resolvers,
        )
      : null;

    return filterDraftsByScope(visible, scope, searchMatchedIds, walletAccounts);
  }, [drafts, scope, chains, resolvers, walletAccounts]);

  return { drafts: visibleDrafts, available };
}
