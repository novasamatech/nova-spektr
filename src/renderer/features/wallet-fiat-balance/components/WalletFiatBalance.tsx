import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';

import { type ID } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatFiatBalance } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';
import { FiatBalance, priceProviderModel } from '@/entities/price';
import { walletModel } from '@/entities/wallet';
import { walletFiatBalanceModel } from '../model/fiatBalance';

BigNumber.config({
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

type Props = {
  walletId: ID;
  className?: string;
};

export const WalletFiatBalance = ({ walletId, className }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const walletBalances = useUnit(walletFiatBalanceModel.$activeWalletBalance);
  const activeWallet = useUnit(walletModel.$activeWallet);

  if (!fiatFlag || walletId !== activeWallet?.id) {
    return null;
  }

  if (!walletBalances) {
    return <Skeleton width={14} height={4.5} />;
  }

  const { value: formattedValue, suffix } = formatFiatBalance(walletBalances.toString());

  const balanceValue = t('assetBalance.number', { value: formattedValue });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
