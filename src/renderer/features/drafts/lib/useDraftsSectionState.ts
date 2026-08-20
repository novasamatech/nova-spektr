import { useUnit } from 'effector-react';

import { backendContactsModel } from '@/features/contacts';

import { type DraftListScope } from './draft-scope';
import { useCanReadDrafts } from './useCanReadDrafts';
import { useVisibleDrafts } from './useVisibleDrafts';

/**
 * What the Operations view needs to draw the Drafts heading itself: whether the
 * group renders at all (mirrors `DraftsSection`'s own early return) and how
 * many rows it holds (count shown only while the address book is healthy).
 */
export const useDraftsSectionState = (scope?: DraftListScope) => {
  const isHealthy = useUnit(backendContactsModel.$isHealthy);
  const canRead = useCanReadDrafts();
  const { drafts } = useVisibleDrafts(scope);

  return {
    isAvailable: !(isHealthy && !canRead),
    count: isHealthy && drafts.length > 0 ? drafts.length : undefined,
  };
};
