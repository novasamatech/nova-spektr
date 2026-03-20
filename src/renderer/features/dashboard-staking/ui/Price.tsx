import { memo } from 'react';

import { formatFiatBalance } from '@/shared/lib/utils';
import { type CurrencyItem } from '@/domains/price';

type Props = {
  amount: string;
  currency: CurrencyItem | null;
};

export const Price = memo(({ amount, currency }: Props) => {
  const { formatted } = formatFiatBalance(amount);
  const display = currency?.symbol ? `${currency.symbol}${formatted}` : `${formatted} ${currency?.code ?? ''}`;

  return <span>{display}</span>;
});
