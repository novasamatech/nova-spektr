import { useStoreMap, useUnit } from 'effector-react';
import BN from 'bignumber.js';

import { Shimmering } from '@renderer/shared/ui';
import { priceProviderModel } from '../model/price-provider-model';
import { currencyModel } from '../model/currency-model';
import { formatFiatBalance, ZERO_BALANCE } from '@renderer/shared/lib/utils';
import { FiatBalance } from './FiatBalance';
import { useI18n } from '@renderer/app/providers';
import type { Asset } from '@renderer/shared/core';

type Props = {
  asset: Asset;
  amount?: string;
  className?: string;
};

export const AssetFiatBalance = ({ asset, amount, className }: Props) => {
  const { t } = useI18n();

  const currency = useUnit(currencyModel.$activeCurrency);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const price = useStoreMap(priceProviderModel.$assetsPrices, (prices) => {
    if (!currency || !prices || !asset.priceId || !prices[asset.priceId]) return;

    return asset.priceId && prices[asset.priceId][currency.coingeckoId];
  });

  if (!fiatFlag) return null;

  if (!asset.priceId || !amount) {
    return <FiatBalance amount={ZERO_BALANCE} className={className} />;
  }

  if (!price) return <Shimmering width={56} height={18} />;

  const priceToShow = new BN(price.price).multipliedBy(new BN(amount));

  const { value: formattedValue, suffix, decimalPlaces } = formatFiatBalance(priceToShow.toString(), asset.precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
