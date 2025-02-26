import { type BN } from '@polkadot/util';

import { type Asset, type AssetByChains } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance } from '@/shared/lib/utils';

type Props = {
  value: BN | string;
  asset?: Asset | AssetByChains;
  className?: string;
  showSymbol?: boolean;
};

export const AssetBalance = ({ value, asset, className, showSymbol = true }: Props) => {
  const { t } = useI18n();

  if (!asset) {
    return null;
  }

  const { precision, symbol } = asset;
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(value, precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <span className={cnTw('text-body text-text-primary', className)}>
      {balanceValue}
      {suffix} {showSymbol && symbol}
    </span>
  );
};
