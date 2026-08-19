import { type Transaction, TransactionType } from '@/shared/core';

/**
 * The `payout_stakers_by_page` calls a queued claim carries.
 *
 * A claim is one payout call, or a `batchAll` of them when it settles several
 * (era, validator, page) triples at once — the basket stores whichever it is.
 * `getCoreTx` unwraps a batch to its first inner call, which is how the row is
 * recognised, but everything the confirmation states about a claim is a fact
 * about the whole transaction: how many payouts, over how many eras, across how
 * many validators.
 *
 * Non-payout entries of a batch are ignored rather than counted — nothing
 * builds such a mix today, and counting a foreign call as a payout would
 * overstate the claim.
 */
export function collectPayoutCalls(transaction: Transaction): Transaction[] {
  if (transaction.type === TransactionType.PAYOUT_STAKERS_BY_PAGE) return [transaction];

  const inner: Transaction[] = transaction.args?.transactions ?? [];

  return inner.filter((tx) => tx.type === TransactionType.PAYOUT_STAKERS_BY_PAGE);
}

/** What the confirmation reports in place of an amount. */
export function summarizePayouts(payouts: Transaction[]) {
  return {
    payoutCount: payouts.length,
    eraCount: new Set(payouts.map((payout) => payout.args.era)).size,
    validatorCount: new Set(payouts.map((payout) => payout.args.validatorStash)).size,
  };
}
