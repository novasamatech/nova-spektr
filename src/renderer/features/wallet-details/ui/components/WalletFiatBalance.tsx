import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';

import { type ID } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatFiatBalance } from '@/shared/lib/utils';
import { Shimmering } from '@/shared/ui';
import { FiatBalance, priceProviderModel } from '@/entities/price';
import { walletModel } from '@/entities/wallet';
import { walletBalanceModel } from '../../model/wallet-balance';

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
  const walletBalances = useUnit(walletBalanceModel.$walletBalance);
  const activeWallet = useUnit(walletModel.$activeWallet);

  if (!fiatFlag || walletId !== activeWallet?.id) {
    return null;
  }

  if (!walletBalances) {
    return <Shimmering width={56} height={18} />;
  }

  const { value: formattedValue, suffix } = formatFiatBalance(walletBalances.toString());

  const balanceValue = t('assetBalance.number', { value: formattedValue });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
