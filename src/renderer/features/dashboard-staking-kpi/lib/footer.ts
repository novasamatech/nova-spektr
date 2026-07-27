import { type AssetAmount, isPositive, nonZeroAmounts } from './amounts';

/**
 * A KPI card's footer is a call to action, not a status line. When there is
 * nothing to redeem and nothing to claim the whole strip is dropped — the card
 * never says "nothing to withdraw", because an empty row of placeholders is
 * noise on a dashboard the user scans rather than reads.
 */
export type UnbondingFooterInput = {
  /** Still locked, per asset. */
  unbonding: AssetAmount[];
  /** Already unlocked and withdrawable, per asset. */
  redeemable: AssetAmount[];
  /** How many positions hold something withdrawable. */
  withdrawableCount: number;
};

export type UnbondingFooter = {
  /** Unbonding plus redeemable, per asset — everything on its way out. */
  amounts: AssetAmount[];
  withdrawableCount: number;
};

function mergeByAsset(groups: AssetAmount[][]): AssetAmount[] {
  const merged = new Map<string, AssetAmount>();

  for (const group of groups) {
    for (const entry of group) {
      const existing = merged.get(entry.symbol);
      if (existing) {
        existing.amount = (BigInt(existing.amount || '0') + BigInt(entry.amount || '0')).toString();
      } else {
        merged.set(entry.symbol, { ...entry });
      }
    }
  }

  return [...merged.values()];
}

/**
 * `null` drops the footer entirely. Redeemable alone is enough to keep it: a
 * position whose chunks have all matured has nothing "unbonding" left, yet is
 * precisely the one that needs the Redeem link.
 */
export function getUnbondingFooter({
  unbonding,
  redeemable,
  withdrawableCount,
}: UnbondingFooterInput): UnbondingFooter | null {
  const amounts = nonZeroAmounts(mergeByAsset([unbonding, redeemable]));

  if (amounts.length === 0) return null;

  return { amounts, withdrawableCount };
}

export type UnclaimedFooterInput = {
  /** Fiat value of everything unclaimed. */
  totalFiat: string;
  amounts: AssetAmount[];
  /** Days until the oldest unclaimed era falls out of the claim window. */
  daysUntilExpiry: number | null;
};

export type UnclaimedFooter = {
  totalFiat: string;
  amounts: AssetAmount[];
  daysUntilExpiry: number | null;
};

export function getUnclaimedFooter({
  totalFiat,
  amounts,
  daysUntilExpiry,
}: UnclaimedFooterInput): UnclaimedFooter | null {
  const nonZero = nonZeroAmounts(amounts);

  if (nonZero.length === 0 && !isPositive(totalFiat)) return null;

  return { totalFiat, amounts: nonZero, daysUntilExpiry };
}
