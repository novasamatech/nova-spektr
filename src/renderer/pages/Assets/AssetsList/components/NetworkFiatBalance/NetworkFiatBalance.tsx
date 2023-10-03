import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import BN from 'bignumber.js';

import { Asset, Balance } from '@renderer/entities/asset';
import { formatFiatBalance, totalAmount } from '@renderer/shared/lib/utils';
import { FiatBalance } from '@renderer/entities/price/ui/FiatBalance';
import { currencyModel, priceProviderModel } from '@renderer/entities/price';
import { useI18n } from '@renderer/app/providers';

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
      if (!prices || !asset.priceId || !currency || !currency?.coingeckoId) return acc;

      const price = prices[asset.priceId][currency.coingeckoId];

      const balance = balances[asset.assetId.toString()];

      if (price && balance) {
        const fiatBalance = new BN(price.price).multipliedBy(new BN(totalAmount(balance)));
        const BNWithConfig = BN.clone();
        BNWithConfig.config({
          ROUNDING_MODE: BNWithConfig.ROUND_DOWN,
        });

        const bnPrecision = new BNWithConfig(asset.precision);
        const TEN = new BNWithConfig(10);

        acc = acc.plus(new BNWithConfig(fiatBalance.toString()).div(TEN.pow(bnPrecision)));
      }

      return acc;
    }, new BN(0));

    setFiatAmount(totalFiatAmount);
  }, [assets.length, prices, currency, balances]);

  if (!fiatFlag) return null;

  const { value: formattedValue, suffix } = formatFiatBalance(fiatAmount.toString(), 0);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
