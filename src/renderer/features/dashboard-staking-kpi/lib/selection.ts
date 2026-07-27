import { type UnclaimedPayout } from '@/domains/staking';

import { canAct } from './access';
import { type AssetAmount, isPositive, nonZeroAmounts, sumFiat, sumPlanck } from './amounts';
import { type ClaimRow } from './types';

/**
 * A row is claimable when the account can actually sign for it and there is
 * something to claim. Watch-only rows and rows with nothing unclaimed are
 * dimmed and uncheckable rather than hidden — the user still wants to see that
 * the account exists and has earned nothing outstanding.
 */
export function isClaimable(row: ClaimRow): boolean {
  return canAct(row.accessMode) && isPositive(row.unclaimed);
}

export function claimableKeys(rows: ClaimRow[]): string[] {
  return rows.filter(isClaimable).map((row) => row.key);
}

export type SelectAllState = 'none' | 'some' | 'all';

export function getSelectAllState(rows: ClaimRow[], selected: ReadonlySet<string>): SelectAllState {
  const selectable = claimableKeys(rows);
  if (selectable.length === 0) return 'none';

  const chosen = selectable.filter((key) => selected.has(key)).length;
  if (chosen === 0) return 'none';

  return chosen === selectable.length ? 'all' : 'some';
}

/** Select-all toggles the whole claimable set; anything else clears it. */
export function toggleSelectAll(rows: ClaimRow[], selected: ReadonlySet<string>): string[] {
  return getSelectAllState(rows, selected) === 'all' ? [] : claimableKeys(rows);
}

export function toggleRow(selected: ReadonlySet<string>, key: string): string[] {
  const next = new Set(selected);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }

  return [...next];
}

export type ClaimRequest = {
  accountId: ClaimRow['accountId'];
  chainId: ClaimRow['chainId'];
  payouts: UnclaimedPayout[];
};

export type SelectionTotals = {
  count: number;
  /** Per asset — never summed across chains. */
  amounts: AssetAmount[];
  fiat: string;
  requests: ClaimRequest[];
};

/**
 * What the drill-down footer prints and what the claim action would carry.
 * Non-claimable rows are ignored even if their key somehow survives in the
 * selection (a row can become watch-only or fully claimed while the modal is
 * open).
 */
export function computeSelectionTotals(rows: ClaimRow[], selected: ReadonlySet<string>): SelectionTotals {
  const chosen = rows.filter((row) => selected.has(row.key) && isClaimable(row));

  const byAsset = new Map<string, AssetAmount>();
  for (const row of chosen) {
    const existing = byAsset.get(row.symbol);
    if (existing) {
      existing.amount = sumPlanck([existing.amount, row.unclaimed]);
    } else {
      byAsset.set(row.symbol, { symbol: row.symbol, precision: row.precision, amount: row.unclaimed });
    }
  }

  return {
    count: chosen.length,
    amounts: nonZeroAmounts([...byAsset.values()]),
    fiat: sumFiat(chosen.map((row) => row.unclaimedFiat)),
    requests: chosen.map((row) => ({ accountId: row.accountId, chainId: row.chainId, payouts: row.payouts })),
  };
}
