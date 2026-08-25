import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { type DraftAvailability, canStartDraft, useDraftAvailability, useDraftSourceLookup } from '@/features/drafts';
import { type DraftPolicy } from '../lib';

/**
 * Which terminal state stops this user from authoring drafts, in this widget's
 * own vocabulary — `null` while they can.
 *
 * `canStartDraft` rather than a second reading of the same states: it is the
 * drafts feature's own answer, and `DraftModeCard` hides itself by exactly this
 * rule. `offline` passes it — the address book was connected before, its
 * contacts are still cached, the card carries its own reconnect prompt, and
 * refusing at the dashboard would hide the one control that fixes it.
 */
function toBlockedReason(availability: DraftAvailability): DraftPolicy['blockedReason'] {
  if (canStartDraft(availability)) return null;

  return availability === 'noPermission' ? 'draftsNoPermission' : 'draftsNotConnected';
}

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
 * Translating the drafts vocabulary into this one happens here, so the rule
 * itself keeps a single owner and `getPositionAccess` stays a pure function of
 * what it is handed.
 */
export const useDraftPolicy = (chainIds: ChainId[]): DraftPolicy => {
  const availability = useDraftAvailability();
  const isDraftSource = useDraftSourceLookup(chainIds);

  return useMemo(
    () => ({ blockedReason: toBlockedReason(availability), isDraftSource }),
    [availability, isDraftSource],
  );
};
