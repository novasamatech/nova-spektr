import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import BigNumber from 'bignumber.js';

import { formatFiatBalance, getRoundedValue, totalAmount } from '@renderer/shared/lib/utils';
import { FiatBalance } from '@renderer/entities/price/ui/FiatBalance';
import { currencyModel, priceProviderModel } from '@renderer/entities/price';
import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { useBalance } from '@renderer/entities/asset';
import { Shimmering } from '@renderer/shared/ui';
import { walletModel } from '@renderer/entities/wallet';

BigNumber.config({
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

type Props = {
  className?: string;
};

export const WalletFiatBalance = ({ className }: Props) => {
  const { t } = useI18n();
  const currency = useUnit(currencyModel.$activeCurrency);
  const prices = useUnit(priceProviderModel.$assetsPrices);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  const { connections } = useNetworkContext();
  const { getLiveBalances } = useBalance();
  const balances = getLiveBalances(activeAccounts.map((a) => a.accountId));

  const [fiatAmount, setFiatAmount] = useState<BigNumber>(new BigNumber(0));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // TODO: Move logic to model https://app.clickup.com/t/8692tr8x0
    const totalFiatAmount = balances.reduce<BigNumber>((acc, balance) => {
      const asset = connections[balance.chainId]?.assets?.find((a) => a.assetId.toString() === balance.assetId);

      if (!prices || !asset?.priceId || !currency || !currency?.coingeckoId || !prices[asset.priceId]) return acc;

      const price = prices[asset.priceId][currency.coingeckoId];

      if (price) {
        const bnFiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);
        acc = acc.plus(bnFiatBalance);
      }

      return acc;
    }, new BigNumber(0));

    if (balances.length > 0) {
      setIsLoading(false);
      setFiatAmount(totalFiatAmount);
    }
  }, [activeAccounts, balances.length, currency, prices]);

  if (!fiatFlag) return null;
  if (isLoading) return <Shimmering width={56} height={18} />;

  const { value: formattedValue, suffix } = formatFiatBalance(fiatAmount.toString());

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
