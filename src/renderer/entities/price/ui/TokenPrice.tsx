import { useStoreMap, useUnit } from 'effector-react';

import { FootnoteText, Shimmering } from '@renderer/shared/ui';
import { priceProviderModel } from '../model/price-provider-model';
import { currencyModel } from '../model/currency-model';
import { formatFiatBalance, ZERO_BALANCE } from '@renderer/shared/lib/utils';
import { FiatBalance } from './FiatBalance';
import { useI18n } from '@renderer/app/providers';

type Props = {
  assetId?: string;
  className?: string;
};

export const TokenPrice = ({ assetId, className }: Props) => {
  const { t } = useI18n();
  const currency = useUnit(currencyModel.$activeCurrency);
  const price = useStoreMap(priceProviderModel.$assetsPrices, (prices) => {
    if (!currency || !prices) return;

    return assetId && prices[assetId]?.[currency.coingeckoId];
  });
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (!fiatFlag) return null;

  if (!assetId) {
    return <FiatBalance amount={ZERO_BALANCE} className={className} />;
  }

  if (!price) return <Shimmering width={56} height={18} />;

  const isGrow = price.change >= 0;
  const changeToShow = price.change && `${isGrow ? '+' : ''}${price.change.toFixed(2)}`;
  const changeStyle = isGrow ? 'text-text-positive' : 'text-text-negative';

  const { value: formattedValue, suffix, decimalPlaces } = formatFiatBalance((price.price ?? 0).toString());

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <div className="flex gap-1">
      <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />

      {Boolean(price.change) && <FootnoteText className={changeStyle}>({changeToShow}%)</FootnoteText>}
    </div>
  );
};
