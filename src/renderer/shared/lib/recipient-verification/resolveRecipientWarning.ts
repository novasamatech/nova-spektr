import { type AccountId } from '@/shared/polkadotjs-schemas';

export type RecipientVerificationMode = 'off' | 'unverifiable' | 'active';
export type RecipientWarning = 'none' | 'unknown' | 'unverifiable';

/**
 * What a call says about where its funds go. `no-recipient` — the call moves no
 * funds to anyone (not a transfer). `recipients` — every recipient it pays
 * (several for a batch). `unresolved` — it is, or may be, a transfer, but the
 * recipient can't be read from it.
 */
export type RecipientCheck =
  | { kind: 'no-recipient' }
  | { kind: 'recipients'; accountIds: AccountId[] }
  | { kind: 'unresolved' };

/**
 * Decides whether a recipient deserves an "unknown address" warning. `off` —
 * external address book never connected (or explicitly disconnected): the whole
 * feature is invisible. `unverifiable` — connected before but currently
 * unhealthy: every recipient is warned until reconnect. `active` — healthy:
 * warn only when the accountId is not among known ones.
 */
export function resolveRecipientWarning(
  mode: RecipientVerificationMode,
  knownAccountIds: Set<AccountId>,
  accountId: AccountId | null,
): RecipientWarning {
  if (mode === 'off' || accountId === null) return 'none';
  if (mode === 'unverifiable') return 'unverifiable';

  return knownAccountIds.has(accountId) ? 'none' : 'unknown';
}

/**
 * Multi-recipient counterpart of `resolveRecipientWarning`. A recipient that
 * can't be read is never "nothing to check": it warns like an unknown one. A
 * list warns when any of its recipients does.
 */
export function resolveRecipientCheckWarning(
  mode: RecipientVerificationMode,
  knownAccountIds: Set<AccountId>,
  check: RecipientCheck,
): RecipientWarning {
  if (mode === 'off' || check.kind === 'no-recipient') return 'none';
  if (mode === 'unverifiable') return 'unverifiable';
  if (check.kind === 'unresolved') return 'unknown';

  return check.accountIds.every((accountId) => knownAccountIds.has(accountId)) ? 'none' : 'unknown';
}
