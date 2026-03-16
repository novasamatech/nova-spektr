import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { formatFiatBalance, nullable } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';
import { priceProviderModel } from '@/domains/price';
import { FiatBalance } from '@/widgets/price';
import { walletBalanceModel } from '../../model/wallet-balance';

BigNumber.config({
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

type Props = {
  className?: string;
};

export const WalletFiatBalance = ({ className }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const walletBalances = useUnit(walletBalanceModel.$walletBalance);
  const isLoading = useUnit(walletBalanceModel.$isLoading);

  if (!fiatFlag) {
    return null;
  }

  if (nullable(walletBalances) || isLoading) {
    return <Skeleton width={14} height={4} />;
  }

  const { value: formattedValue, suffix } = formatFiatBalance(walletBalances.toString());

  const balanceValue = t('assetBalance.number', { value: formattedValue });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
