import { useUnit } from 'effector-react';

import { cnTw } from '@/shared/lib/utils';
import { Shimmering } from '@/shared/ui/Shimmering/Shimmering';
import { FootnoteText } from '@/shared/ui/Typography';
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
    return <Shimmering width={56} height={18} />;
  }

  return (
    <FootnoteText className={cnTw('text-footnote text-text-tertiary', className)}>
      <Price amount={amount} symbol={currency?.symbol} code={currency?.code || ''} />
    </FootnoteText>
  );
};
