import BigNumber from 'bignumber.js';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';

import type { ID } from '@shared/core';
import { formatFiatBalance } from '@shared/lib/utils';
import { Shimmering } from '@shared/ui';

import { priceProviderModel } from '@entities/price';
import { FiatBalance } from '@entities/price/ui/FiatBalance';
import { walletModel } from '@entities/wallet';

import { walletSelectModel } from '../model/wallet-select-model';

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
