import { memo } from 'react';

import { type CurrencyItem } from '@/domains/price';
import { formatFiat } from '../lib/format-fiat';

type Props = {
  amount: string | null;
  currency: CurrencyItem | null;
};

export const Price = memo(({ amount, currency }: Props) => <span>{formatFiat(amount, currency)}</span>);
