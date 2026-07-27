import { default as BigNumber } from 'bignumber.js';

import { formatBalance } from '@/shared/lib/utils';

/**
 * A planck amount together with the asset that gives it meaning. Amounts of
 * different assets are never summed — they are printed side by side (`5.38M
 * DOT
 *
 * - 60K KSM`), which is the only honest way to total a multi-chain stake.
 */
export type AssetAmount = {
  symbol: string;
  precision: number;
  /** Planck, as a decimal string. */
  amount: string;
};

export function isPositive(amount: string): boolean {
  return new BigNumber(amount).gt(0);
}

/** Drops zero/empty entries, keeping the source order. */
export function nonZeroAmounts(amounts: AssetAmount[]): AssetAmount[] {
  return amounts.filter((entry) => isPositive(entry.amount));
}

/**
 * Thousands are abbreviated here even though the app's default keeps them
 * spelled out: a KPI card has room for `71.2K DOT`, not `71,200.4821 DOT`, and
 * the exact figure lives one click away in the drill-down and the CSV.
 */
const KPI_SHORTHANDS = { K: true } as const;

export function formatAssetAmount({ amount, precision, symbol }: AssetAmount): string {
  const { formatted } = formatBalance(amount, precision, { shorthands: KPI_SHORTHANDS });

  return `${formatted} ${symbol}`;
}

type FormatOptions = {
  /** Prefix put in front of the whole line, e.g. `+` for rewards. */
  sign?: string;
  /** Rendered when nothing is left after dropping zeros. */
  fallback?: string;
};

/**
 * `5.38M DOT + 60K KSM`. Zero amounts are dropped, so an asset the user does
 * not hold never occupies a slot in the line.
 */
export function formatAssetAmounts(amounts: AssetAmount[], options: FormatOptions = {}): string {
  const { sign = '', fallback = '' } = options;
  const parts = nonZeroAmounts(amounts).map(formatAssetAmount);

  if (parts.length === 0) return fallback;

  return `${sign}${parts.join(' + ')}`;
}

/** Sums planck amounts of the same asset. */
export function sumPlanck(values: string[]): string {
  return values.reduce((sum, value) => sum.plus(value || '0'), new BigNumber(0)).toFixed(0);
}

export function sumFiat(values: string[]): string {
  return values.reduce((sum, value) => sum.plus(value || '0'), new BigNumber(0)).toString();
}
