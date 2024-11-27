import { type BN } from '@polkadot/util';

import { type Asset, type AssetByChains } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance } from '@/shared/lib/utils';
import { AssetIcon } from '@/shared/ui-entities';

type Props = {
  value: BN | string;
  asset?: Asset | AssetByChains; // maybe change type to Asset | number to allow pass just asset id and then get asset by id
  className?: string;
  showIcon?: boolean;
  wrapperClassName?: string;
  showSymbol?: boolean;
};

export const AssetBalance = ({ value, asset, className, showIcon, wrapperClassName, showSymbol = true }: Props) => {
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

  const balance = (
    <span className={cnTw('text-body text-text-primary', className)}>
      {balanceValue} {suffix} {showSymbol && symbol}
    </span>
  );

  if (!showIcon) {
    return balance;
  }

  return (
    <p className={cnTw('flex items-center gap-x-2', wrapperClassName)}>
      <AssetIcon asset={asset} size={32} />
      {balance}
    </p>
  );
};
