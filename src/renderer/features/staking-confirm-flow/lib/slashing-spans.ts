import { nullable } from '@/shared/lib/utils';
import { type StakingSlashingSpans } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * What `num_slashing_spans` falls back to when the chain cannot answer.
 *
 * `withdraw_unbonded` only ever compares the argument with `>=` against the
 * stash's real span count, so erring upwards is safe and erring downwards is
 * not: a stash whose ledger is being closed out rejects the call outright with
 * `IncorrectSlashingSpans`. One is the smallest value that is still right for
 * every stash that has never been slashed — which is nearly all of them — and
 * is what the app has always sent.
 */
export const DEFAULT_SLASHING_SPANS = 1;

export type SlashingSpansEntry = {
  validator: AccountId;
  spans: StakingSlashingSpans | null | undefined;
};

/**
 * The span count `withdraw_unbonded` has to be given for one stash.
 *
 * `SlashingSpans` holds the current span plus every prior one, so the number
 * the runtime iterates is `prior.length + 1`. A stash with no entry has never
 * been slashed and needs nothing; it still gets the floor rather than zero,
 * because a value that is too large only costs weight while one that is too
 * small fails the extrinsic.
 */
export function resolveSlashingSpanCount(spans: StakingSlashingSpans | null | undefined): number {
  if (nullable(spans)) return DEFAULT_SLASHING_SPANS;

  return Math.max(spans.prior.length + 1, DEFAULT_SLASHING_SPANS);
}

/**
 * One span count per requested stash.
 *
 * `entries` is `null` on a runtime that dropped the `SlashingSpans` storage
 * (staking-async): there the question cannot be asked at all, and every stash
 * takes the floor.
 */
export function buildSlashingSpanCounts(
  accountIds: AccountId[],
  entries: SlashingSpansEntry[] | null,
): Record<AccountId, number> {
  const byAccount = new Map((entries ?? []).map((entry) => [entry.validator, entry.spans]));

  const counts: Record<AccountId, number> = {};
  for (const accountId of accountIds) {
    counts[accountId] = resolveSlashingSpanCount(byAccount.get(accountId));
  }

  return counts;
}
