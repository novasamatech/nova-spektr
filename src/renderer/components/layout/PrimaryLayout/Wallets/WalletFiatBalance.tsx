import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import BigNumber from 'bignumber.js';

import { formatAmount, formatBalance, formatFiatBalance, totalAmount } from '@renderer/shared/lib/utils';
import { FiatBalance } from '@renderer/entities/price/ui/FiatBalance';
import { currencyModel, priceProviderModel } from '@renderer/entities/price';
import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { useAccount } from '@renderer/entities/account';
import { useBalance } from '@renderer/entities/asset';
import { HexString } from '@renderer/domain/shared-kernel';
import { Shimmering } from '@renderer/shared/ui';

BigNumber.config({
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

type Props = {
  className?: string;
  walletId?: string;
  accountId?: HexString;
};

export const WalletFiatBalance = ({ className, walletId, accountId }: Props) => {
  const { t } = useI18n();
  const [fiatAmount, setFiatAmount] = useState<BigNumber>(new BigNumber(0));
  const [isLoading, setIsLoading] = useState(true);

  const { getLiveAccounts } = useAccount();
  const { connections } = useNetworkContext();
  const { getLiveBalances } = useBalance();

  const accounts = walletId && getLiveAccounts({ walletId });
  const accountIds = accounts ? accounts.map((a) => a.accountId) : accountId ? [accountId] : [];

  const balances = getLiveBalances(accountIds);

  const currency = useUnit(currencyModel.$activeCurrency);
  const prices = useUnit(priceProviderModel.$assetsPrices);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  useEffect(() => {
    setIsLoading(true);
    // TODO: Move logic to model https://app.clickup.com/t/8692tr8x0
    const totalFiatAmount = balances.reduce<BigNumber>((acc, balance) => {
      const asset = connections[balance.chainId]?.assets?.find((a) => a.assetId.toString() === balance.assetId);

      if (!prices || !asset?.priceId || !currency || !currency?.coingeckoId) return acc;

      const price = prices[asset.priceId][currency.coingeckoId];

      if (price) {
        const fiatBalance = new BigNumber(price.price).multipliedBy(new BigNumber(totalAmount(balance)));
        const formattedFiatBalance = formatFiatBalance(fiatBalance.toString(), asset.precision);

        acc = acc.plus(new BigNumber(formatAmount(formattedFiatBalance, 2)));
      }

      return acc;
    }, new BigNumber(0));

    if (balances.length > 0) {
      setIsLoading(false);
      setFiatAmount(totalFiatAmount);
    }
  }, [walletId, accountId, balances.length, currency]);

  if (!fiatFlag) return null;
  if (isLoading) return <Shimmering width={56} height={18} />;

  const { value: formattedValue, suffix } = formatBalance(fiatAmount.toString(), 2);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: 2,
  });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
