import { useUnit } from 'effector-react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui/Typography';
import { Skeleton } from '@/shared/ui-kit';
import { currencyModel } from '../model/currency-model';

import { Price } from './Price';

type Props = {
  priceId?: string;
  amount?: string;
  className?: string;
};

export const FiatBalance = ({ amount, className }: Props) => {
  const currency = useUnit(currencyModel.$activeCurrency);

  if (!amount) {
    return <Skeleton width="56px" height="18px" />;
  }

  return (
    <FootnoteText className={cnTw('text-footnote text-text-tertiary', className)}>
      <Price amount={amount} symbol={currency?.symbol} code={currency?.code || ''} />
    </FootnoteText>
  );
};
