import { default as BigNumber } from 'bignumber.js';
import { memo } from 'react';

import { formatFiatBalance } from '@/shared/lib/utils';
import { type CurrencyItem } from '@/domains/price';
import { DUST_FIAT_THRESHOLD } from '../lib/formatToken';

type Props = {
  amount: string;
  currency: CurrencyItem | null;
};

export const Price = memo(({ amount, currency }: Props) => {
  const value = new BigNumber(amount);
  // A fraction of a cent is not a price the user can act on; say so instead of
  // printing a ten-digit tail.
  const isDust = value.gt(0) && value.lt(DUST_FIAT_THRESHOLD);
  const formatted = isDust ? DUST_FIAT_THRESHOLD.toString() : formatFiatBalance(amount).formatted;
  const priced = currency?.symbol ? `${currency.symbol}${formatted}` : `${formatted} ${currency?.code ?? ''}`;

  return <span className="whitespace-nowrap">{isDust ? `<${priced}` : priced}</span>;
});
