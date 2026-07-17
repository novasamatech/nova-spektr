import { type AccountId } from '@/shared/polkadotjs-schemas';

export type RecipientVerificationMode = 'off' | 'unverifiable' | 'active';
export type RecipientWarning = 'none' | 'unknown' | 'unverifiable';

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
