import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Draft, operationDescriptionsResource } from '@/domains/backend';

import { useReadableDrafts } from './useReadableDrafts';
import { filterVisibleDrafts } from './visible-drafts';

/**
 * Readable drafts minus the ones already linked to a live operation — exactly
 * the rows the Drafts section renders. `available` mirrors `useReadableDrafts`
 * (backend healthy + draft-read permission).
 */
export function useVisibleDrafts(): { drafts: Draft[]; available: boolean } {
  const { drafts, available } = useReadableDrafts();
  const linkedDraftIds = useUnit(operationDescriptionsResource.$linkedDraftIds);
  const operationsLoaded = useUnit(operationDescriptionsResource.$operationsLoaded);

  const visibleDrafts = useMemo(
    () => filterVisibleDrafts(drafts, linkedDraftIds, operationsLoaded),
    [drafts, linkedDraftIds, operationsLoaded],
  );

  return { drafts: visibleDrafts, available };
}
