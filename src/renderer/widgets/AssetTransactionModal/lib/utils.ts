import { TFunction } from 'i18next';

import { formatBalance, totalAmount } from '@shared/lib/utils';
import type { AssetChain } from '@features/assets/AssetsPortfolioView';
import { Step } from './types';

export const assetTransactionUtils = {
  isNoneStep,
  getChainBalance,
};

function isNoneStep(step: Step): boolean {
  return step === Step.NONE;
}

function getChainBalance(t: TFunction, chain: AssetChain, precision: number): string {
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(totalAmount(chain.balance), precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return `${balanceValue} ${suffix} ${chain.assetSymbol}`;
}
