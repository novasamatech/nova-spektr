import { useUnit } from 'effector-react';

import { connectionHistoryModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';

import { useCanCreateDraft } from './useCanCreateDraft';

/**
 * Whether this user can hand an operation over as a draft, and if not, why.
 *
 * - `ready` — the address book is reachable and the user may write drafts.
 * - `offline` — it was connected before and is not reachable now. Still offered:
 *   reconnecting is a click away and the draft card carries the prompt itself,
 *   so a caller should let the user in rather than turn them away.
 * - `notConnected` — no external address book was ever connected here. Drafts are
 *   stored in it; without one there is nowhere to put them.
 * - `noPermission` — connected and reachable, but the account is not allowed to
 *   create drafts. Nothing the user can do about it from here.
 *
 * The last two are terminal, which is the distinction callers act on: a surface
 * that merely _predicts_ whether a draft can be authored — a dashboard row
 * deciding whether to offer an action — must reach the same verdict as the flow
 * it opens, or it sends the user into a form whose draft toggle renders
 * nothing. That is why `DraftModeCard` is expressed in these terms too, rather
 * than spelling the same three stores out a second time.
 */
export type DraftAvailability = 'ready' | 'offline' | 'notConnected' | 'noPermission';

export const useDraftAvailability = (): DraftAvailability => {
  const hasEverConnected = useUnit(connectionHistoryModel.$hasEverConnected);
  const isHealthy = useUnit(backendContactsModel.$isHealthy);
  const canWrite = useCanCreateDraft();

  if (!hasEverConnected) return 'notConnected';
  if (!isHealthy) return 'offline';

  return canWrite ? 'ready' : 'noPermission';
};

/** Whether a draft can be started at all — `offline` counts, it is recoverable. */
export function canStartDraft(availability: DraftAvailability): boolean {
  return availability === 'ready' || availability === 'offline';
}
