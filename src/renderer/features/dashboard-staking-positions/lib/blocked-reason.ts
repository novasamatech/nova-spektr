import { DRAFT_NO_WRITE_PERMISSION_KEY } from '@/features/drafts';

import { type PositionAccess, type PositionBlockedReason } from './types';

/**
 * What to tell the user about a position that offers no actions.
 *
 * One string per reason rather than one for all four, because the four are not
 * equally final and the next move differs: two are facts about the address, one
 * asks the user to connect an address book, one to ask an admin. A single
 * "unavailable" would flatten a fixable state into a dead one.
 *
 * The permission case borrows the drafts feature's own sentence — the same
 * wording the drafts list shows for the same permission, so the user does not
 * learn two names for one rule. It arrives as `DRAFT_NO_WRITE_PERMISSION_KEY`
 * rather than as a second copy of the key string: a rename over there would
 * otherwise leave this tooltip rendering a raw i18n path, with nothing to catch
 * it.
 */
const BLOCKED_REASON_KEYS: Record<PositionBlockedReason, string> = {
  watchOnly: 'dashboard.staking.positions.detail.blocked.watchOnly',
  noDraftRoute: 'dashboard.staking.positions.detail.blocked.noDraftRoute',
  draftsNotConnected: 'dashboard.staking.positions.detail.blocked.draftsNotConnected',
  draftsNoPermission: DRAFT_NO_WRITE_PERMISSION_KEY,
};

/**
 * Reasons no action of the user's can lift.
 *
 * `watchOnly` and `noDraftRoute` are facts about the address and will be just
 * as true tomorrow. The two draft reasons are a missing connection and a
 * missing permission — labelling those "view only" tells the user the row is
 * dead when it is one click, or one admin, away from acting.
 */
const TERMINAL_REASONS: readonly PositionBlockedReason[] = ['watchOnly', 'noDraftRoute'];

/** The i18n key explaining why this position is blocked, `null` when it is not. */
export function getBlockedReasonKey(access: PositionAccess): string | null {
  return access.mode === 'blocked' ? BLOCKED_REASON_KEYS[access.reason] : null;
}

/** Whether the row is data only for good — see `TERMINAL_REASONS`. */
export function isViewOnly(access: PositionAccess): boolean {
  return access.mode === 'blocked' && TERMINAL_REASONS.includes(access.reason);
}
