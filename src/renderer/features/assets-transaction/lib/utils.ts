import { type TFunction } from 'i18next';

import { formatBalance } from '@/shared/lib/utils';
import { type AssetChain } from '@/features/assets';

import { type StatusType } from './types';

export const assetTransactionUtils = {
  getChainBalance,
  getStatusTitle,
};

function getChainBalance(t: TFunction, chain: AssetChain, precision: number): string {
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(chain.balance?.total, precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return `${balanceValue} ${suffix} ${chain.assetSymbol}`;
}

function getStatusTitle(type: StatusType | null): string {
  switch (type) {
    case 'legacy':
      return 'receive.legacyAddressCopied';
    case 'unified':
      return 'receive.unifiedAddressCopied';
    default:
      return 'receive.addressCopied';
  }
}
