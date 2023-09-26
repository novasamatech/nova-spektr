import { useStoreMap, useUnit } from 'effector-react';
import BN from 'bignumber.js';

import { Shimmering } from '@renderer/shared/ui';
import { priceProviderModel } from '../model/price-provider-model';
import { currencyModel } from '../model/currency-model';
import { formatBalance } from '@renderer/shared/lib/utils';
import { FiatBalance } from './FiatBalance';
import { ZERO_FIAT_BALANCE } from '../lib/constants';
import { Asset } from '@renderer/entities/asset';
import { useI18n } from '@renderer/app/providers';

type Props = {
  asset: Asset;
  amount?: string;
  className?: string;
};

export const AssetFiatBalance = ({ asset, amount, className }: Props) => {
  const { t } = useI18n();

  const currency = useUnit(currencyModel.$activeCurrency);
  const price = useStoreMap(priceProviderModel.$assetsPrices, (prices) => {
    if (!currency || !prices) return;

    return asset.priceId && prices[asset.priceId][currency.coingeckoId];
  });

  if (!asset.priceId || !amount) {
    return <FiatBalance amount={ZERO_FIAT_BALANCE} className={className} />;
  }

  if (!price) return <Shimmering width={56} height={18} />;

  const priceToShow = new BN(price.price).multipliedBy(new BN(amount));

  const { value: formattedValue, suffix } = formatBalance(priceToShow.toString(), asset.precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: 2,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
