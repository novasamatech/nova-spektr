import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Draft } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { $accountNameSources, createAccountNameResolver, searchOperationRows } from '@/aggregates/operations-search';

import { type DraftListScope, buildDraftSearchRow, filterDraftsByScope } from './draft-scope';
import { useReadableDrafts } from './useReadableDrafts';
import { filterVisibleDrafts } from './visible-drafts';

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
  const nameSources = useUnit($accountNameSources);

  const visibleDrafts = useMemo(() => {
    const visible = filterVisibleDrafts(drafts);
    if (!scope) return visible;

    // Names are resolved over the pre-search list: resolving over the already
    // filtered one would shrink the set as the user types and make matches
    // disappear mid-query. Skipped entirely without a query — building the rows
    // costs an address encoding per account, and the no-query case is the norm.
    const searchMatchedIds = scope.searchQuery.trim()
      ? searchOperationRows(
          visible.map((draft) => buildDraftSearchRow(draft, chains)),
          scope.searchQuery,
          createAccountNameResolver(nameSources),
        )
      : null;

    return filterDraftsByScope(visible, scope, searchMatchedIds);
  }, [drafts, scope, chains, nameSources]);

  return { drafts: visibleDrafts, available };
}
