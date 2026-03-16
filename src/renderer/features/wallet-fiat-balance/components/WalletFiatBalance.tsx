import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { balanceService } from '@/shared/api/balances';
import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatFiatBalance } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';
import { useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { FiatBalance } from '@/widgets/price';

BigNumber.config({
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

type Props = {
  wallet: Wallet;
  className?: string;
};

export const WalletFiatBalance = ({ wallet, className }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(currencySelect.$fiatFlag);

  const chains = useUnit(networkModel.$chains);
  const balances = useUnit(balanceModel.$balanceMap);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const balance = useMemo(() => {
    if (!fiatFlag) return null;

    return balanceService.calculateWalletBalance({
      accounts: wallet.accounts,
      chains,
      balances,
      currency,
      prices,
    });
  }, [wallet, chains, balances, currency, prices, fiatFlag]);

  if (!fiatFlag) {
    return null;
  }

  if (!balance) {
    return <Skeleton width={14} height={4.5} />;
  }

  const { value: formattedValue, suffix } = formatFiatBalance(balance.toString());

  const balanceValue = t('assetBalance.number', { value: formattedValue });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
