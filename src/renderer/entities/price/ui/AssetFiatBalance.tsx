import { type BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type Asset, type AssetByChains } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ZERO_BALANCE, formatFiatBalance } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';
import { currencyModel } from '../model/currency-model';
import { priceProviderModel } from '../model/price-provider-model';

import { FiatBalance } from './FiatBalance';

type Props = {
  asset: Asset | AssetByChains;
  amount?: BigNumber | BN | string;
  className?: string;
};

export const AssetFiatBalance = memo(({ asset, amount, className }: Props) => {
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

  const amountBn = BigNumber.isBigNumber(amount) ? amount : new BigNumber(amount.toString());

  const assetPrices = prices?.[asset.priceId];
  const price = currency && assetPrices && assetPrices[currency.coingeckoId];

  if (!price) {
    return <Skeleton width="56px" height="18px" />;
  }

  const priceToShow = new BigNumber(price.price).multipliedBy(amountBn);

  const { value: formattedValue, suffix, decimalPlaces } = formatFiatBalance(priceToShow.toString(), asset.precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
});
