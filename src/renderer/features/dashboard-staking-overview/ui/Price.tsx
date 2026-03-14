import { memo } from 'react';

import { type CurrencyItem } from '@/shared/api/price-provider';
import { formatFiatBalance } from '@/shared/lib/utils';

type Props = {
  amount: string;
  currency: CurrencyItem | null;
};

export const Price = memo(({ amount, currency }: Props) => {
  const { formatted } = formatFiatBalance(amount);
  const display = currency?.symbol ? `${currency.symbol}${formatted}` : `${formatted} ${currency?.code ?? ''}`;

  return <span>{display}</span>;
});
