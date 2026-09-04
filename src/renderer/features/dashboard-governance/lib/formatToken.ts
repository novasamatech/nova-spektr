import { type BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { formatBalance } from '@/shared/lib/utils';

/**
 * Below this many whole tokens a balance is shown as "<0.0001" instead of a
 * 10-digit tail.
 */
export const DUST_TOKEN_THRESHOLD = new BigNumber('0.0001');

/** Below this much fiat a price is shown as "<0.01". */
export const DUST_FIAT_THRESHOLD = new BigNumber('0.01');

/**
 * Whether a non-zero token amount is too small to read as a number — a
 * single-planck class lock, a rounding residue — and should be labelled as dust
 * rather than printed in full.
 */
export const isDustToken = (amount: BN | string, precision: number): boolean => {
  const whole = new BigNumber(amount.toString()).div(new BigNumber(10).pow(precision));

  return whole.gt(0) && whole.lt(DUST_TOKEN_THRESHOLD);
};

/**
 * `1.5M DOT` — `formatBalance`'s `formatted` already carries the magnitude
 * suffix; dust reads `<0.0001 DOT`.
 */
export const formatToken = (amount: BN | string, precision: number, symbol: string) => {
  if (isDustToken(amount, precision)) return `<${DUST_TOKEN_THRESHOLD.toString()} ${symbol}`;

  return `${formatBalance(amount, precision).formatted} ${symbol}`;
};
