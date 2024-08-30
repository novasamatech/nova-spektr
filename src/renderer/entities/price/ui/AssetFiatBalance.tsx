import BN from 'bignumber.js';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { type Asset, type AssetByChains } from '@shared/core';
import { ZERO_BALANCE, formatFiatBalance } from '@shared/lib/utils';
import { Shimmering } from '@shared/ui';
import { currencyModel } from '../model/currency-model';
import { priceProviderModel } from '../model/price-provider-model';

import { FiatBalance } from './FiatBalance';

type Props = {
  asset: Asset | AssetByChains;
  amount?: BN | string;
  className?: string;
};

export const AssetFiatBalance = ({ asset, amount, className }: Props) => {
  const { t } = useI18n();

  const currency = useUnit(currencyModel.$activeCurrency);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const prices = useUnit(priceProviderModel.$assetsPrices);

  if (!fiatFlag) {
    return null;
  }

  if (!asset.priceId || !amount) {
    return <FiatBalance amount={ZERO_BALANCE} className={className} />;
  }

  const amountBn = BN.isBigNumber(amount) ? amount : new BN(amount);

  const price =
    currency && prices && asset.priceId && prices[asset.priceId] && prices[asset.priceId][currency.coingeckoId];

  if (!price) {
    return <Shimmering width={56} height={18} />;
  }

  const priceToShow = new BN(price.price).multipliedBy(amountBn);

  const { value: formattedValue, suffix, decimalPlaces } = formatFiatBalance(priceToShow.toString(), asset.precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
