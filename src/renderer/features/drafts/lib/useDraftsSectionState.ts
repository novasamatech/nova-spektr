import { useUnit } from 'effector-react';

import { PERMISSIONS } from '@/domains/backend';
import { authModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';

import { type DraftListScope } from './draft-scope';
import { useVisibleDrafts } from './useVisibleDrafts';

/**
 * What the Operations view needs to draw the Drafts heading itself: whether the
 * group renders at all (mirrors `DraftsSection`'s own early return) and how
 * many rows it holds (count shown only while the address book is healthy).
 */
export const useDraftsSectionState = (scope?: DraftListScope) => {
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const authState = useUnit(authModel.$authState);
  const isHealthy = useUnit(backendContactsModel.$isHealthy);
  const { drafts } = useVisibleDrafts(scope);

  const canRead = isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_READ) ?? false);

  return {
    isAvailable: !(isHealthy && !canRead),
    count: isHealthy && drafts.length > 0 ? drafts.length : undefined,
  };
};
