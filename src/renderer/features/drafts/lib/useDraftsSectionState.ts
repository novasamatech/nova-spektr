import { useUnit } from 'effector-react';

import { type Draft } from '@/domains/backend';
import { backendContactsModel } from '@/features/contacts';

import { type DraftListScope } from './draft-scope';
import { useCanReadDrafts } from './useCanReadDrafts';
import { useVisibleDrafts } from './useVisibleDrafts';

type DraftsSectionState = {
  /**
   * Whether the Drafts group renders at all: it is hidden only when the address
   * book is healthy and the user lacks the draft-read permission (an unhealthy
   * address book still shows the group, behind its health overlay).
   */
  isAvailable: boolean;
  /** Address-book health; rows and the count are only shown while healthy. */
  isHealthy: boolean;
  /** The rows the group holds, already narrowed to `scope`. */
  drafts: Draft[];
  /** Heading count: `drafts.length` (also `0`) while healthy, hidden otherwise. */
  count: number | undefined;
};

/**
 * The single source of truth for the Drafts group's availability and rows,
 * shared by the Operations view (which draws the heading and decides whether to
 * mount the group) and by `DraftsSection` itself (which renders the rows).
 */
export const useDraftsSectionState = (scope?: DraftListScope): DraftsSectionState => {
  const isHealthy = useUnit(backendContactsModel.$isHealthy);
  const canRead = useCanReadDrafts();
  const { drafts } = useVisibleDrafts(scope);

  return {
    isAvailable: !(isHealthy && !canRead),
    isHealthy,
    drafts,
    count: isHealthy ? drafts.length : undefined,
  };
};
