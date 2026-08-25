import { type PositionAccess, type PositionBlockedReason } from './types';

/**
 * What to tell the user about a position that offers no actions.
 *
 * One string per reason rather than one for all four, because the four are not
 * equally final and the next move differs: three are facts about what this
 * installation can do with the address, one asks the user to connect an address
 * book. A single "unavailable" would flatten a fixable state into a dead one.
 *
 * The permission case gets its own sentence rather than the drafts list's
 * generic one: from a position row the useful next move is not "ask your admin"
 * but "add this account's key to a wallet", which is what the sentence says.
 */
const BLOCKED_REASON_KEYS: Record<PositionBlockedReason, string> = {
  watchOnly: 'dashboard.staking.positions.detail.blocked.watchOnly',
  noDraftRoute: 'dashboard.staking.positions.detail.blocked.noDraftRoute',
  draftsNotConnected: 'dashboard.staking.positions.detail.blocked.draftsNotConnected',
  draftsNoPermission: 'dashboard.staking.positions.detail.blocked.draftsNoPermission',
};

/**
 * Reasons no action of the user's can lift.
 *
 * `watchOnly` and `noDraftRoute` are facts about the address and will be just
 * as true tomorrow. A missing draft permission is decided outside this app —
 * nothing the user does on the dashboard grants it — so from here the row is as
 * read-only as a watch-only one, and it reads the same way. The missing
 * connection is different: reconnecting is one click away, and labelling that
 * row "view only" would tell the user it is dead when it is not.
 */
const TERMINAL_REASONS: readonly PositionBlockedReason[] = ['watchOnly', 'noDraftRoute', 'draftsNoPermission'];

/** The i18n key explaining why this position is blocked, `null` when it is not. */
export function getBlockedReasonKey(access: PositionAccess): string | null {
  return access.mode === 'blocked' ? BLOCKED_REASON_KEYS[access.reason] : null;
}

/** Whether the row is data only for good — see `TERMINAL_REASONS`. */
export function isViewOnly(access: PositionAccess): boolean {
  return access.mode === 'blocked' && TERMINAL_REASONS.includes(access.reason);
}
