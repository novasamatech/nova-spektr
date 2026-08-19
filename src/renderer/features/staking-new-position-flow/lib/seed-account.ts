import { type ID } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

/**
 * Which account the "Stake from" field seeds itself with.
 *
 * One rule, two callers: the field is seeded when the candidate list changes (a
 * chain switch strips accounts the new network cannot hold) and again when the
 * active wallet changes. Writing it twice let the two drift apart, which is how
 * they came to disagree about a wallet id naming a wallet the app no longer
 * lists.
 *
 * Preference is the active wallet's own account, because that is the wallet the
 * user is looking at; any candidate beats none, because the signing path is
 * computed _from_ an initiator and an empty field renders nothing to click.
 * `null` — no wallet selected, or one whose accounts this chain cannot hold —
 * is not a special case: it simply expresses no preference and takes the first
 * candidate.
 */
export function pickSeedAccount(available: AnyAccount[], walletId: ID | null): AnyAccount | null {
  const ownAccount = walletId === null ? undefined : available.find((account) => account.walletId === walletId);

  return ownAccount ?? available[0] ?? null;
}
