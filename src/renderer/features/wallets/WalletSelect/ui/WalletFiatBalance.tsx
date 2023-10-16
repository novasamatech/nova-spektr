import { useUnit } from 'effector-react';
import BigNumber from 'bignumber.js';

import { formatFiatBalance } from '@renderer/shared/lib/utils';
import { FiatBalance } from '@renderer/entities/price/ui/FiatBalance';
import { useI18n } from '@renderer/app/providers';
import { Shimmering } from '@renderer/shared/ui';
import { priceProviderModel } from '@renderer/entities/price';
import type { Wallet } from '@renderer/shared/core';
import { walletSelectModel } from '../model/wallet-select-model';

BigNumber.config({
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

type Props = {
  walletId: Wallet['id'];
  className?: string;
};

export const WalletFiatBalance = ({ walletId, className }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const walletBalances = useUnit(walletSelectModel.$walletBalances);

  if (!fiatFlag) {
    return null;
  }

  if (!walletBalances[walletId]) {
    return <Shimmering width={56} height={18} />;
  }

  const { value: formattedValue, suffix } = formatFiatBalance(walletBalances[walletId].toString());

  const balanceValue = t('assetBalance.number', { value: formattedValue });

  return <FiatBalance amount={`${balanceValue}${suffix}`} className={className} />;
};
