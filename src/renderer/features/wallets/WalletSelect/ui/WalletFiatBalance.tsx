import { useUnit } from 'effector-react';
import BigNumber from 'bignumber.js';

import { formatFiatBalance } from '@shared/lib/utils';
import { FiatBalance } from '@entities/price/ui/FiatBalance';
import { useI18n } from '@app/providers';
import { Shimmering } from '@shared/ui';
import { priceProviderModel } from '@entities/price';
import type { ID } from '@shared/core';
import { walletSelectModel } from '../model/wallet-select-model';
import { walletModel } from '@entities/wallet';

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
  const walletBalances = useUnit(walletSelectModel.$walletBalance);
  const activeWallet = useUnit(walletModel.$activeWallet);

  if (!fiatFlag || walletId !== activeWallet?.id) return null;

  if (!walletBalances) {
    return <Shimmering width={56} height={18} />;
  }

  const { value: formattedValue, suffix } = formatFiatBalance(walletBalances.toString());

  const balanceValue = t('assetBalance.number', { value: formattedValue });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
