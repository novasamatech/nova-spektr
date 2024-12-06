import { useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { ZERO_BALANCE, cnTw, formatFiatBalance } from '@/shared/lib/utils';
import { FootnoteText, Shimmering } from '@/shared/ui';
import { currencyModel } from '../model/currency-model';
import { priceProviderModel } from '../model/price-provider-model';

import { FiatBalance } from './FiatBalance';

type Props = {
  assetId?: string;
  className?: string;
  wrapperClassName?: string;
};

export const TokenPrice = memo(({ assetId, className, wrapperClassName }: Props) => {
  const { t } = useI18n();
  const currency = useUnit(currencyModel.$activeCurrency);
  const price = useStoreMap({
    store: priceProviderModel.$assetsPrices,
    keys: [currency, assetId],
    fn: (prices, [currency, assetId]) => {
      if (!currency || !prices || !assetId) return null;

      const assetPrice = prices[assetId];
      if (!assetPrice) return null;

      return assetPrice[currency.coingeckoId] ?? null;
    },
  });
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (!fiatFlag) {
    return null;
  }

  if (!assetId) {
    return (
      <div className={wrapperClassName}>
        <FiatBalance amount={ZERO_BALANCE} className={className} />
      </div>
    );
  }

  if (!price) {
    return <Shimmering width={56} height={18} />;
  }

  const isGrow = price.change >= 0;
  const changeToShow = price.change && `${isGrow ? '+' : ''}${price.change.toFixed(2)}`;
  const changeStyle = isGrow ? 'text-text-positive' : 'text-text-negative';

  const { value: formattedValue, suffix, decimalPlaces } = formatFiatBalance((price.price ?? 0).toString());

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <div className={cnTw('flex gap-1', wrapperClassName)}>
      <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />

      {Boolean(price.change) && <FootnoteText className={changeStyle}>{changeToShow}%</FootnoteText>}
    </div>
  );
});
