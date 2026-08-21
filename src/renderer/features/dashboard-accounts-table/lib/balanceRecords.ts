import { type Balance } from '@/shared/core';

/**
 * Whether the balance store holds _any_ record for these accounts.
 *
 * Distinguishes "we have not looked yet" from "we looked and there is nothing":
 * a record is written for every (account, chain, asset) pair the subscription
 * queries, zero balances included, so the first record arriving is the moment
 * an empty table becomes a statement about the accounts rather than about the
 * app's own progress. Until then the widget renders a skeleton, never zeros.
 * Mirrors `dashboard-portfolio-overview/lib/balanceRecords.ts` (kept
 * feature-local by convention).
 */
export const hasBalanceRecords = (balanceMap: Record<string, Balance>, accountIds: string[]): boolean => {
  if (accountIds.length === 0) return false;

  const wanted = new Set(accountIds);

  for (const balance of Object.values(balanceMap)) {
    if (wanted.has(balance.accountId)) return true;
  }

  return false;
};
