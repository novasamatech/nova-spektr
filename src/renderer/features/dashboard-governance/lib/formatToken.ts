import { type BN } from '@polkadot/util';

import { formatBalance } from '@/shared/lib/utils';

/**
 * `1.5M DOT` — `formatBalance`'s `formatted` already carries the magnitude
 * suffix.
 */
export const formatToken = (amount: BN | string, precision: number, symbol: string) =>
  `${formatBalance(amount, precision).formatted} ${symbol}`;
