import { useStoreMap, useUnit } from 'effector-react';
import BN from 'bignumber.js';

import { FootnoteText, Shimmering } from '@renderer/shared/ui';
import { priceProviderModel } from '../model/price-provider-model';
import { currencyModel } from '../model/currency-model';
import { Decimal } from '@renderer/shared/lib/utils';
import { ZERO_FIAT_BALANCE } from '../lib/constants';
import { FiatBalance } from './FiatBalance';

type Props = {
  assetId?: string;
  className?: string;
};

export const TokenPrice = ({ assetId, className }: Props) => {
  const currency = useUnit(currencyModel.$activeCurrency);
  const price = useStoreMap(priceProviderModel.$assetsPrices, (prices) => {
    if (!currency || !prices) return;

    return assetId && prices[assetId]?.[currency.coingeckoId];
  });
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (!fiatFlag) return null;

  if (!assetId) {
    return <FiatBalance amount={ZERO_FIAT_BALANCE} className={className} />;
  }

  if (!price) return <Shimmering width={56} height={18} />;

  const isGrow = price.change >= 0;
  const changeToShow = price.change && `${isGrow ? '+' : ''}${price.change.toFixed(2)}`;
  const changeStyle = isGrow ? 'text-text-positive' : 'text-text-negative';

  const priceToShow = new BN(price.price || 0).toFormat(Decimal.BIG_NUMBER);

  return (
    <div className="flex gap-1">
      <FiatBalance amount={priceToShow} className={className} />

      {Boolean(price.change) && <FootnoteText className={changeStyle}>({changeToShow}%)</FootnoteText>}
    </div>
  );
};
