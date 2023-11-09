import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import BN from 'bignumber.js';

import { formatFiatBalance, getRoundedValue, totalAmount } from '@renderer/shared/lib/utils';
import { FiatBalance } from '@renderer/entities/price/ui/FiatBalance';
import { currencyModel, priceProviderModel } from '@renderer/entities/price';
import { useI18n } from '@renderer/app/providers';
import type { Asset, Balance } from '@renderer/shared/core';

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
      if (!prices || !asset.priceId || !currency || !currency?.coingeckoId || !prices[asset.priceId]) return acc;

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

  if (!fiatFlag) return null;

  const { value: formattedValue, suffix, decimalPlaces } = formatFiatBalance(fiatAmount.toString());

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
