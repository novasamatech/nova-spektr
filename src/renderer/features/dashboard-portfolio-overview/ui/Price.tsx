import { memo } from 'react';

import { type CurrencyItem } from '@/domains/price';
import { formatFiat } from '../lib/formatFiat';

type Props = {
  amount: string | null;
  currency: CurrencyItem | null;
};

export const Price = memo(({ amount, currency }: Props) => {
  return <span>{formatFiat(amount, currency)}</span>;
});
