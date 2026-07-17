import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Draft } from '@/domains/backend';
import { networkModel } from '@/entities/network';

import { type DraftListScope, filterDraftsByScope } from './draft-scope';
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

  const visibleDrafts = useMemo(() => {
    const visible = filterVisibleDrafts(drafts);

    return scope ? filterDraftsByScope(visible, scope, chains) : visible;
  }, [drafts, scope, chains]);

  return { drafts: visibleDrafts, available };
}
