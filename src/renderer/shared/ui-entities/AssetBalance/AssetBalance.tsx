import { type BN } from '@polkadot/util';

import { type Asset, type AssetByChains } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance } from '@/shared/lib/utils';

type Props = {
  value?: BN | string;
  asset?: Asset | AssetByChains;
  className?: string;
  showSymbol?: boolean;
  keepPrecision?: boolean;
  testId?: string;
};

export const AssetBalance = ({
  value,
  asset,
  className,
  showSymbol = true,
  keepPrecision = false,
  testId = 'AssetBalance',
}: Props) => {
  const { t } = useI18n();

  if (!asset) {
    return null;
  }

  const { precision, symbol } = asset;
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(value, precision, { keepPrecision });

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <span className={cnTw('shrink-0 text-body text-text-primary', className)} data-testid={testId}>
      {balanceValue}
      {suffix} {showSymbol && symbol}
    </span>
  );
};
