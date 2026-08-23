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
 * learn two names for one rule.
 */
const BLOCKED_REASON_KEYS: Record<PositionBlockedReason, string> = {
  watchOnly: 'dashboard.staking.positions.detail.blocked.watchOnly',
  noDraftRoute: 'dashboard.staking.positions.detail.blocked.noDraftRoute',
  draftsNotConnected: 'dashboard.staking.positions.detail.blocked.draftsNotConnected',
  draftsNoPermission: 'operations.drafts.noWritePermission',
};

/** The i18n key explaining why this position is blocked, `null` when it is not. */
export function getBlockedReasonKey(access: PositionAccess): string | null {
  return access.reason === null ? null : BLOCKED_REASON_KEYS[access.reason];
}
