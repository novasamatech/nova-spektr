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
 * Decides whether a call's recipients deserve an "unknown address" warning.
 * `off` — external address book never connected (or explicitly disconnected):
 * the whole feature is invisible. `unverifiable` — connected before but
 * currently unhealthy: every recipient is warned until reconnect. `active` —
 * healthy: warn when any recipient is not among known ones. A recipient that
 * can't be read is never "nothing to check": it warns like an unknown one.
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

/** The check of a single, already read recipient; `null` — no recipient. */
export function toRecipientCheck(accountId: AccountId | null): RecipientCheck {
  return accountId === null ? { kind: 'no-recipient' } : { kind: 'recipients', accountIds: [accountId] };
}

/** Single-recipient form of `resolveRecipientCheckWarning`. */
export function resolveRecipientWarning(
  mode: RecipientVerificationMode,
  knownAccountIds: Set<AccountId>,
  accountId: AccountId | null,
): RecipientWarning {
  return resolveRecipientCheckWarning(mode, knownAccountIds, toRecipientCheck(accountId));
}
