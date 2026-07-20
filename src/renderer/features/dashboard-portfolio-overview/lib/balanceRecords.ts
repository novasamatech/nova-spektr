import { type Balance } from '@/shared/core';

/**
 * Whether the balance store holds _any_ record for these accounts.
 *
 * The distinction this exists to draw is "we have not looked yet" versus "we
 * looked and there is nothing". Both render as zero holdings, because a balance
 * of zero produces no holding and no allocation — so emptiness alone cannot
 * tell them apart, and the card used to guess with a timer.
 *
 * A record is written for every (account, chain, asset) pair the subscription
 * queries, zero balances included, so the first record arriving is the moment
 * "nothing to show" becomes a statement about the accounts rather than about
 * the app's own progress. This is the same signal the Portfolio page shimmers
 * on — there, per row: a row with no record renders a skeleton, never a zero.
 */
export function hasBalanceRecords(balanceMap: Record<string, Balance>, accountIds: string[]): boolean {
  if (accountIds.length === 0) return false;

  const wanted = new Set(accountIds);

  for (const balance of Object.values(balanceMap)) {
    if (wanted.has(balance.accountId)) return true;
  }

  return false;
}
