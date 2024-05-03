import { useUnit } from 'effector-react';
import BN from 'bignumber.js';

import { Shimmering } from '@shared/ui';
import { priceProviderModel } from '../model/price-provider-model';
import { currencyModel } from '../model/currency-model';
import { formatFiatBalance, ZERO_BALANCE } from '@shared/lib/utils';
import { FiatBalance } from './FiatBalance';
import { useI18n } from '@app/providers';
import type { Asset, TokenAsset } from '@shared/core';

type Props = {
  asset: Asset | TokenAsset;
  amount?: string;
  className?: string;
};

export const AssetFiatBalance = ({ asset, amount, className }: Props) => {
  const { t } = useI18n();

  const currency = useUnit(currencyModel.$activeCurrency);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const prices = useUnit(priceProviderModel.$assetsPrices);

  if (!fiatFlag) return null;

  if (!asset.priceId || !amount) {
    return <FiatBalance amount={ZERO_BALANCE} className={className} />;
  }

  const price =
    currency && prices && asset.priceId && prices[asset.priceId] && prices[asset.priceId][currency.coingeckoId];

  if (!price) return <Shimmering width={56} height={18} />;

  const priceToShow = new BN(price.price).multipliedBy(new BN(amount));

  const { value: formattedValue, suffix, decimalPlaces } = formatFiatBalance(priceToShow.toString(), asset.precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
