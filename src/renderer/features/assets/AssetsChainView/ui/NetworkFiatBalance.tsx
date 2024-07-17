import BN from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';

import type { Asset, Balance } from '@shared/core';
import { formatFiatBalance, getRoundedValue, totalAmount } from '@shared/lib/utils';

import { currencyModel, priceProviderModel } from '@entities/price';
import { FiatBalance } from '@entities/price/ui/FiatBalance';

type Props = {
  assets: Asset[];
  balances: Record<string, Balance>;
  className?: string;
};

export const NetworkFiatBalance = ({ assets, balances, className }: Props) => {
  const { t } = useI18n();
  const [fiatAmount, setFiatAmount] = useState<BN>(new BN(0));

  const currency = useUnit(currencyModel.$activeCurrency);
  const prices = useUnit(priceProviderModel.$assetsPrices);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  useEffect(() => {
    // TODO: Move logic to model https://app.clickup.com/t/8692tr8x0
    const totalFiatAmount = assets.reduce<BN>((acc, asset) => {
      if (!prices || !asset.priceId || !currency || !currency?.coingeckoId || !prices[asset.priceId]) {
        return acc;
      }

      const price = prices[asset.priceId][currency.coingeckoId];

      const balance = balances[asset.assetId.toString()];

      if (price && balance) {
        const bnFiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);
        acc = acc.plus(bnFiatBalance);
      }

      return acc;
    }, new BN(0));

    setFiatAmount(totalFiatAmount);
  }, [assets.length, prices, currency, balances]);

  if (!fiatFlag) {
    return null;
  }

  const { value: formattedValue, suffix, decimalPlaces } = formatFiatBalance(fiatAmount.toString());

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
