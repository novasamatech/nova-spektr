import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { useDraftAvailability, useDraftSourceLookup } from '@/features/drafts';
import { type DraftPolicy } from '../lib';

/**
 * The draft rule for a whole surface, resolved once.
 *
 * `getPositionAccess` runs once per row, so the two questions behind it — may
 * this user create drafts at all, and can a draft start at this address on this
 * chain — are answered here and passed down rather than asked again per row.
 *
 * Both answers come from `features/drafts`, which is the point: the dashboard
 * only _predicts_ that a draft can be authored, and the flow it opens decides
 * for real. A second spelling of either rule produces a row that leads to a
 * form with no draft toggle, or to an empty source list and no way forward.
 */
export const useDraftPolicy = (chainIds: ChainId[]): DraftPolicy => {
  const availability = useDraftAvailability();
  const isDraftSource = useDraftSourceLookup(chainIds);

  return useMemo(() => ({ availability, isDraftSource }), [availability, isDraftSource]);
};
