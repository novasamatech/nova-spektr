import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type Asset, type Balance } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatFiatBalance, getRoundedValue, totalAmount } from '@/shared/lib/utils';
import { useAssetsPrices } from '@/domains/price';
import { currencySelect } from '@/aggregates/currency-select';
import { FiatBalance } from '@/widgets/price';

type Props = {
  assets: Asset[];
  balances: Record<string, Balance>;
  className?: string;
};

export const NetworkFiatBalance = ({ assets, balances, className }: Props) => {
  const { t } = useI18n();
  const [fiatAmount, setFiatAmount] = useState<BigNumber>(new BigNumber(0));

  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);
  const fiatFlag = useUnit(currencySelect.$fiatFlag);

  useEffect(() => {
    // TODO: Move logic to model https://app.clickup.com/t/8692tr8x0
    const totalFiatAmount = assets.reduce<BigNumber>((acc, asset) => {
      if (!prices || !asset.priceId || !currency || !currency?.coingeckoId || !prices[asset.priceId]) {
        return acc;
      }

      const price = prices[asset.priceId]?.[currency.coingeckoId];

      const balance = balances[asset.assetId.toString()];

      if (price && balance) {
        const bnFiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);
        acc = acc.plus(bnFiatBalance);
      }

      return acc;
    }, new BigNumber(0));

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
